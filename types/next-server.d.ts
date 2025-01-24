declare module 'next/server' {
  export class NextRequest extends Request {
    json(): Promise<any>;
    formData(): Promise<FormData>;
  }

  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
  }
} 