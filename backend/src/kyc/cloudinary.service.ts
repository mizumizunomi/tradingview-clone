import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { createHash } from 'crypto';
import axios from 'axios';

/**
 * Uploads KYC documents to Cloudinary via signed REST (no SDK dependency).
 *
 * The API secret never leaves the backend: the file bytes are posted server-side with a
 * SHA-1 signature over the upload params. Documents go into a dedicated `kyc/` folder.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloud = process.env.CLOUDINARY_CLOUD_NAME;
  private readonly key = process.env.CLOUDINARY_API_KEY;
  private readonly secret = process.env.CLOUDINARY_API_SECRET;

  get configured(): boolean {
    return !!(this.cloud && this.key && this.secret);
  }

  /**
   * Upload a file buffer to Cloudinary under kyc/. Returns the secure HTTPS URL.
   * `resourceType` is 'image' for photos; large/PDF docs can use 'auto'.
   */
  async uploadKycDocument(
    buffer: Buffer,
    mimetype: string,
    resourceType: 'image' | 'auto' = 'image',
  ): Promise<string> {
    if (!this.configured) {
      throw new InternalServerErrorException('Document storage is not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'kyc';
    // Signed params must be sorted alphabetically, joined, then the secret appended.
    const toSign = `folder=${folder}&timestamp=${timestamp}${this.secret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;
    const form = new URLSearchParams({
      file: dataUri,
      api_key: this.key!,
      timestamp,
      signature,
      folder,
    });

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${this.cloud}/${resourceType}/upload`,
        form.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30_000, maxBodyLength: Infinity },
      );
      return res.data.secure_url as string;
    } catch (err) {
      const detail =
        (axios.isAxiosError(err) && err.response?.data?.error?.message) || (err as Error).message;
      this.logger.error(`Cloudinary upload failed: ${detail}`);
      throw new InternalServerErrorException('Failed to upload document');
    }
  }
}
