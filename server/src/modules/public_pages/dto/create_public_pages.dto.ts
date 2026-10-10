import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PublicPageStatus } from '../interfaces/public_pages.interface';

export class CreatePublicPagesDto {
  @ApiProperty({ example: 'home' })
  @IsString()
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: 'Homepage' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    enum: PublicPageStatus,
    example: PublicPageStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PublicPageStatus)
  status: PublicPageStatus = PublicPageStatus.DRAFT;
}
