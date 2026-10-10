import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from './interfaces/auth.interface';
import { AuthResponseDto } from './dto/auth_response.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt_auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register local user' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    type: AuthResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already exists',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login local user' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiOkResponse({
    description: 'Current user',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid bearer token',
  })
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user.sub);
  }

  @Delete('delete/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user' })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'User deleted successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid bearer token',
  })
  deleteMe(@Req() request: AuthenticatedRequest) {
    return this.authService.delete(request.user.sub);
  }

  @Delete('delete/:userId')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({
    name: 'userId',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'User deleted successfully',
      },
    },
  })
  delete(@Param('userId') userId: string) {
    return this.authService.delete(userId);
  }
}
