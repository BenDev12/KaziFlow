import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AddTaskNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  text!: string;
}
