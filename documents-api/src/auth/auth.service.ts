import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from '../application/dto/auth/register.dto';
import { LoginDto } from '../application/dto/auth/login.dto';
import { RefreshTokenDto } from '../application/dto/auth/refresh-token.dto';
import { UserEntity } from 'src/domain/entities/user.entity';
import { TokenPairVm } from 'src/application/viewmodels/token-pair.vm';
import { AccessTokenData } from './interfaces/access-token-data';
import { RefreshTokenData } from './interfaces/refresh-token-data';
import { UserRepositoryPort } from 'src/domain/ports/user-repository.port';
import { UserSessionRepositoryPort } from 'src/domain/ports/user-session-repository.port';
import { PasswordEncryptionPort } from 'src/domain/ports/password-encryption.port';
import { JwtPort } from 'src/domain/ports/jwt.port';

@Injectable()
export class AuthService {
    private readonly accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    private readonly refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    private readonly accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN;
    private readonly refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN;

    constructor(
        private readonly userRepository: UserRepositoryPort,
        private readonly passwordEncryptionService: PasswordEncryptionPort,
        private readonly jwtService: JwtPort,
        private readonly userSessionRepository: UserSessionRepositoryPort
    ) {}

    async register(
        data: RegisterDto
    ) {
        const existingUser = await this.userRepository.findByEmail(data.email);
        if (existingUser) {
            throw new BadRequestException("Cet email est déjà utilisé");
        }

        let hashedPassword = await this.passwordEncryptionService.hashPassword(data.password);

        let payload: UserEntity = {
            firstname: data.firstname,
            lastname: data.lastname,
            email: data.email,
            password: hashedPassword,
        };

        let user = await this.userRepository.create(payload);

        let tokenPair = await this.createUserSession(user);

        return tokenPair;
    }

    async login(data: LoginDto): Promise<TokenPairVm> {
        const user = await this.userRepository.findByEmail(data.email);
        if (!user) {
            throw new UnauthorizedException("Email ou mot de passe incorrect");
        }

        const isPasswordValid = await this.passwordEncryptionService.comparePassword(
            data.password,
            user.password
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException("Email ou mot de passe incorrect");
        }

        return this.createUserSession(user);
    }

    async refreshToken(data: RefreshTokenDto): Promise<TokenPairVm> {
        // Vérifier et décoder le refresh token
        let tokenData: RefreshTokenData;
        try {
            tokenData = this.jwtService.verify<RefreshTokenData>(
                data.refresh_token,
                this.refreshTokenSecret!
            );
        } catch {
            throw new UnauthorizedException("Refresh token invalide ou expiré");
        }

        // Vérifier que c'est bien un refresh token
        if (tokenData.type !== "refresh") {
            throw new UnauthorizedException("Token invalide");
        }

        // Chercher la session dans user_sessions
        const session = await this.userSessionRepository.findByRefreshToken(data.refresh_token);
        if (!session) {
            throw new UnauthorizedException("Session non trouvée");
        }

        // Vérifier que l'utilisateur existe
        const user = await this.userRepository.findById(tokenData.sub);
        if (!user) {
            throw new UnauthorizedException("Utilisateur non trouvé");
        }

        // Supprimer l'ancienne session
        await this.userSessionRepository.delete(session.id!);

        // Créer une nouvelle session
        return this.createUserSession(user);
    }

    private async createUserSession(user: UserEntity): Promise<TokenPairVm> {
        const accessToken = await this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user);

        await this.userSessionRepository.create({
            user_id: user.id!,
            refresh_token: refreshToken,
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    private async generateAccessToken(user: UserEntity): Promise<string> {
        const payload: AccessTokenData = {
            sub: user.id!,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            type: "access",
        };

        return this.jwtService.sign(
            payload,
            this.accessTokenExpiresIn!,
            this.accessTokenSecret!
        );
    }

    private async generateRefreshToken(user: UserEntity): Promise<string> {
        const payload: RefreshTokenData = {
            sub: user.id!,
            email: user.email,
            type: "refresh",
        };

        return this.jwtService.sign(
            payload, this.refreshTokenExpiresIn!, this.refreshTokenSecret!
        );
    }
}
