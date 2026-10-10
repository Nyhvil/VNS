import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUsersDto } from './dto/create_users.dto';
import { UpdateUsersDto } from './dto/update_users.dto';
import { UsersResponseDto } from './dto/users_response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated users' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.findPaginated(
      Number(page ?? 1),
      Number(limit ?? 10),
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({
    type: UsersResponseDto,
    isArray: true,
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by email, name, or role' })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'admin',
  })
  @ApiOkResponse({
    type: UsersResponseDto,
    isArray: true,
  })
  search(@Query('q') q: string) {
    return this.usersService.search(q);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get user by email' })
  @ApiParam({
    name: 'email',
    example: 'user@mailguard.com',
  })
  @ApiOkResponse({
    type: UsersResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({
    name: 'id',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UsersResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUsersDto })
  @ApiCreatedResponse({
    type: UsersResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already exists',
  })
  create(@Body() dto: CreateUsersDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({
    name: 'id',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateUsersDto })
  @ApiOkResponse({
    type: UsersResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiConflictResponse({
    description: 'Email already exists',
  })
  update(@Param('id') id: string, @Body() dto: UpdateUsersDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user' })
  @ApiParam({
    name: 'id',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UsersResponseDto,
  })
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({
    name: 'id',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UsersResponseDto,
  })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({
    name: 'id',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'User deleted successfully',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
