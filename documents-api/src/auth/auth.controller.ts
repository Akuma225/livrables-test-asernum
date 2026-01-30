import { Body, Controller, Post, Version } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from 'src/application/dto/auth/register.dto';
import { LoginDto } from 'src/application/dto/auth/login.dto';
import { RefreshTokenDto } from 'src/application/dto/auth/refresh-token.dto';
import { TokenPairVm } from 'src/application/viewmodels/token-pair.vm';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @Version('1')
  async register(
    @Body() data: RegisterDto
  ): Promise<TokenPairVm> {
    return this.authService.register(data);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @Version('1')
  async login(
    @Body() data: LoginDto
  ): Promise<TokenPairVm> {
    return this.authService.login(data);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @Version('1')
  async refresh(
    @Body() data: RefreshTokenDto
  ): Promise<TokenPairVm> {
    return this.authService.refreshToken(data);
  }
}
