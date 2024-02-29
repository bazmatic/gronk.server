import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { SessionGateway } from './session.gateway';
import { GronkHttpRequest, GronkHttpResponse, GronkSession } from './session.types';
import { ProviderTokens } from 'src/tokens';
import { Response } from 'express';

@Injectable()
export class SessionService {
    private sessions: Map<string, GronkSession> = new Map();
    private sessionBySubdomain: Map<string, GronkSession> = new Map();
    constructor(
        @Inject(forwardRef(() => ProviderTokens.SessionGateway))
        private readonly sessionGateway: SessionGateway
    ) {
    }

    public async create(sessionId: string, subdomain: string): Promise<GronkSession> {
        const session = new GronkSession(sessionId, subdomain);
        this.sessions.set(sessionId, session);
        this.sessionBySubdomain.set(subdomain, session);
        return session;
    }

    public async get(sessionId: string): Promise<GronkSession> {
        return this.sessions.get(sessionId);
    }

    public async getBySubdomain(subdomain: string): Promise<GronkSession> {
        return this.sessionBySubdomain.get(subdomain);
    }

    public async deliverRequest(sessionId: string, request: GronkHttpRequest): Promise<GronkHttpResponse> {
        const session = await this.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        return this.sessionGateway.deliverRequest(session.id, request);
    }

}
