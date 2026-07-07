import {
  Body, Controller, Get, Post, UseGuards, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';
import { CloudinaryService } from './cloudinary.service';
import { SubmitKycDto } from './dto/kyc.dto';

type AuthReq = { user: { id: string } };

// Uploaded file shape (multer memory storage); avoids a hard Express.Multer type dependency.
interface UploadedDoc {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(
    private kycService: KycService,
    private cloudinary: CloudinaryService,
  ) {}

  /**
   * Upload a single KYC document. Returns its stored secure URL, which the client then submits
   * as documentFront/documentBack/selfie. Validates type + size before storing.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: UploadedDoc) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('File must be a JPEG, PNG, WebP image or PDF');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File must be 8 MB or smaller');
    }
    const resourceType = file.mimetype === 'application/pdf' ? 'auto' : 'image';
    const url = await this.cloudinary.uploadKycDocument(file.buffer, file.mimetype, resourceType);
    return { url };
  }

  @Get('status')
  getStatus(@Request() req: AuthReq) {
    return this.kycService.getStatus(req.user.id);
  }

  @Post('submit')
  submit(@Request() req: AuthReq, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(req.user.id, dto);
  }
}
