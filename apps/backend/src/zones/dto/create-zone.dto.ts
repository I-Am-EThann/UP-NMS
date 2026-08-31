import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
