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
import { CreateUserAuthAccountsDto } from './dto/create_user_auth_accounts.dto';
import { UpdateUserAuthAccountsDto } from './dto/update_user_auth_accounts.dto';
import { UserAuthAccountsResponseDto } from './dto/user_auth_accounts_response.dto';
import { UserAuthAccountsService } from './user_auth_accounts.service';

@ApiTags('User Auth Accounts')
@Controller('user_auth_accounts')
export class UserAuthAccountsController {
  constructor(
    private readonly userAuthAccountsService: UserAuthAccountsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated user auth accounts' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userAuthAccountsService.findPaginated(
      Number(page ?? 1),
      Number(limit ?? 10),
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all user auth accounts' })
  @ApiOkResponse({
    type: UserAuthAccountsResponseDto,
    isArray: true,
  })
  findAll() {
    return this.userAuthAccountsService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get auth accounts by user ID' })
  @ApiParam({
    name: 'userId',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UserAuthAccountsResponseDto,
    isArray: true,
  })
  findByUserId(@Param('userId') userId: string) {
    return this.userAuthAccountsService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user auth account by ID' })
  @ApiParam({
    name: 'id',
    example: 'aut-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: UserAuthAccountsResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User auth account not found',
  })
  findOne(@Param('id') id: string) {
    return this.userAuthAccountsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user auth account' })
  @ApiBody({ type: CreateUserAuthAccountsDto })
  @ApiCreatedResponse({
    type: UserAuthAccountsResponseDto,
  })
  @ApiConflictResponse({
    description: 'Provider account already exists',
  })
  create(@Body() dto: CreateUserAuthAccountsDto) {
    return this.userAuthAccountsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user auth account' })
  @ApiParam({
    name: 'id',
    example: 'aut-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateUserAuthAccountsDto })
  @ApiOkResponse({
    type: UserAuthAccountsResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User auth account not found',
  })
  update(@Param('id') id: string, @Body() dto: UpdateUserAuthAccountsDto) {
    return this.userAuthAccountsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user auth account' })
  @ApiParam({
    name: 'id',
    example: 'aut-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'User auth account deleted successfully',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User auth account not found',
  })
  remove(@Param('id') id: string) {
    return this.userAuthAccountsService.remove(id);
  }
}
