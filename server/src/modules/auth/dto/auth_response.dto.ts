import { ApiProperty } from '@nestjs/swagger';
import { UsersResponseDto } from '../../users/dto/users_response.dto';

export class AuthResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty({
    type: UsersResponseDto,
  })
  user!: UsersResponseDto;

  constructor(accessToken: string, user: UsersResponseDto) {
    this.access_token = accessToken;
    this.user = user;
  }
}
