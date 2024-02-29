import { Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from "@nestjs/websockets";
import { createServer } from "https";
import { Server, Socket } from "socket.io";
import { SessionService } from "src/session/session.service";
import { ProviderTokens } from "src/tokens";
import { GronkHttpRequest, GronkHttpResponse, GronkSignal } from "./session.types";

@WebSocketGateway({
    cors: {
        origins: "*"
    }
})
export class SessionGateway implements OnGatewayConnection {
    private readonly logger = new Logger(SessionGateway.name);
    
    @WebSocketServer()
    private server: Server;

    private pendingResponses: Map<string, (response: GronkHttpResponse)=>any> = new Map();
    
    constructor(
        @Inject(ProviderTokens.SessionService)
        private readonly sessionService: SessionService,

        private readonly configService: ConfigService,
    ) {
        const httpServer = createServer();

        this.server = new Server(httpServer, {
            cors: {
                origin: "*"
            }
        });
    }

    public async deliverRequest(
        sessionId: string,
        request: GronkHttpRequest
    ): Promise<GronkHttpResponse> {
        if (!this.server) {
            throw new Error('Server not initialized');
        }
        const session = await this.sessionService.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        // Create a new signal id
        const signalId = SessionGateway.makeSignalId();

        // Register that we are awaiting a response for this signal id
        const promise: Promise<GronkHttpResponse> = new Promise((resolve, _reject) => {
            this.pendingResponses.set(signalId, (response: GronkHttpResponse)=> {
                resolve(response);
            });
        });

        // Send the signal contain the request to the client
        this.server.emit(sessionId, new GronkSignal<GronkHttpRequest>(signalId, sessionId, request));
        return promise;
    }

    static makeSignalId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    @SubscribeMessage('session.create')
    public async handleCreateSession(client: Socket, payload: any) {

        this.logger.log(`Creating session: ${client.id}`)
        const session = await this.sessionService.create(
            client.id,
            payload.subdomain,
        );
        const subject = `session.created.${session.id}`;
        client.emit(subject, session);
    }

    /**
     * @dev Handle response signals from the client
     * Look for a callback in the pendingResponses map, and send the HTTP Response to it
     * @param client 
     * @param responseSignal 
     * @returns 
     */
    @SubscribeMessage('signal.response')
    public async handleSignalResponse(_client: Socket, responseSignal: GronkSignal<GronkHttpResponse>) {

        const callback = this.pendingResponses.get(responseSignal.signalId);
        if (!callback) {
            this.logger.warn(`No callback found for signal id: ${responseSignal.signalId}`);
            return;
        }
        callback(responseSignal.data)
    }

    async handleConnection(client: Socket) {
        this.logger.debug(`Client connected: ${client.id}`);

        // const jwt = client?.handshake?.auth?.token;
        // if (!jwt) {
        //     this.logger.error(`Rejected connection from client with no jwt`);
        //     client.disconnect();
        //     return;
        // }
        //const decodedJwt = this.authService.decodeToken(jwt);
        //if (!decodedJwt?.sub) {
        
        //     this.logger.error(
        //         `Rejected connection from client with invalid jwt: ${jwt}`
        //     );
        //     client.disconnect();
        //     return;
        // }

        // user.socketId = jwt;
        // await this.userService.update(
        //     { userId: user.userId },
        //     { socketId: jwt }
        // );
        // this.logger.debug(
        //     `Registered socket id: ${jwt} for user: ${user.userId}`
        // );
    }
}
