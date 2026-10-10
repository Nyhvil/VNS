import { PartialType } from '@nestjs/swagger';
import { CreateUserAuthAccountsDto } from './create_user_auth_accounts.dto';

export class UpdateUserAuthAccountsDto extends PartialType(
  CreateUserAuthAccountsDto,
) {}
