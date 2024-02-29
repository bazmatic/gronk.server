import { Module } from "@nestjs/common";
import { SessionService } from "./session.service";
import { SessionGateway } from "./session.gateway";
import { SessionController } from "./session.controller";
import { ProviderTokens } from "src/tokens";
import { ConfigModule } from "@nestjs/config";

@Module({
    imports: [
        ConfigModule.forRoot({
            cache: true,
            isGlobal: true
        })
    ],
    providers: [
        {
            provide: ProviderTokens.SessionService,
            useClass: SessionService
        },
        {
            provide: ProviderTokens.SessionGateway,
            useClass: SessionGateway
        }
    ],
    controllers: [SessionController]
})
export class SessionModule {}
