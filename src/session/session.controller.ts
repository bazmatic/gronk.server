import { Controller, Get, HttpException, HttpStatus, Inject, Res, Body, Req, Logger } from '@nestjs/common';
import { ProviderTokens } from 'src/tokens';
import { SessionService } from './session.service';
import { GronkHttpRequest } from './session.types';
import { Response, Request } from 'express';

@Controller()
export class SessionController {
    private readonly logger = new Logger(SessionController.name);
    constructor(
        @Inject(ProviderTokens.SessionService)
        private readonly sessionService: SessionService
    ) {

    }

    @Get("*")
    async tunnelRequest(@Req() req: Request, @Body() body: any, @Res() response: Response) {
        this.logger.log('Tunneling request');
        // Get subdomain from request
        const subdomain = req.headers["host"].split('.')[0];

        // Get path of the URL 
        const path = req.url;

        // Look up session by subdomain
        const session = await this.sessionService.getBySubdomain(subdomain);

        // If no session, return 403
        if (!session) {
            throw new HttpException('Not Found', HttpStatus.FORBIDDEN);
        }

        // If session, send the entire request via the session gateway
        // Make a GronkHttpRequest object
        // The headers
        const headers: Record<string, string> = {};
        for (const key in req.headers) {
            if (req.headers.hasOwnProperty(key)) {
                headers[key] = (req.headers[key]).toString();
            }
        }
        const gronkRequest: GronkHttpRequest = new GronkHttpRequest(req.method, path, headers, body);
        
         // Send it through the tunnel and wait for the response
        const sessionResponse = await this.sessionService.deliverRequest(session.id, gronkRequest);
        //response.contentType(sessionResponse.headers)
        // Set headers
        this.logger.debug(`Received response`)
        for (const key in sessionResponse.headers) {
            this.logger.debug(`Trying to set header: ${key.toUpperCase()} to ${sessionResponse.headers[key]}`);
            if (sessionResponse.headers.hasOwnProperty(key)) {
                this.logger.debug(`Setting header: ${key.toUpperCase()} to ${sessionResponse.headers[key]}`);
                response.setHeader(key.toUpperCase(), sessionResponse.headers[key]);
            }
        }
        this.logger.debug(`Content Type: ${JSON.stringify(response.getHeader('content-type'))}`)
        this.logger.debug(`Response: ${sessionResponse.body}`)
        response.status(sessionResponse.statusCode).send(sessionResponse.body);
    }
}
