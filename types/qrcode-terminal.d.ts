declare module 'qrcode-terminal' {
    function generate(text: string, options?: { small?: boolean }): void;
    export = generate;
    export function setErrorLevel(error: string): void;
} 