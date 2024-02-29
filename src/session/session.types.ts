export class GronkSession {
    constructor(
        public id: string, // SocketID
        public subdomain: string // Subdomain to expose for HTTP requests
    ) {}
}

export class GronkHttpRequest {
    constructor(
        public method: string,
        public path: string,
        public headers: string[],
        public body: string
    ) {}
}

export class GronkHttpResponse {
    constructor(
        public statusCode: number,
        public headers: string[],
        public body: string
    ) {}
}

export class GronkSignal<T> {
    constructor(
        public signalId: string,
        public sessionId: string,
        public data: T
    ) {}
}



