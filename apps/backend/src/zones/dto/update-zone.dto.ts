import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateZoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
