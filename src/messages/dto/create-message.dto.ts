import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { MessageType } from '../../../generated/prisma/client.js';

export class CreateMessageDto {
  @IsString()
  chatId: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;
}
