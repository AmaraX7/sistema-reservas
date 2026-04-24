import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// dto para actualizar los resources, como no quiero que sea obligatorio actualziarlo todo lo pongo opcional
export class LoginUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
