import { Module } from '@nestjs/common';
import { UserAuthAccountsController } from './user_auth_accounts.controller';
import { UserAuthAccountsService } from './user_auth_accounts.service';

@Module({
  controllers: [UserAuthAccountsController],
  providers: [UserAuthAccountsService],
  exports: [UserAuthAccountsService],
})
export class UserAuthAccountsModule {}
