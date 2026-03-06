export interface WhatsAppTemplateButton {
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE" | "CATALOG" | "MPM" | "FLOW";
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
}

export interface WhatsAppTemplateComponent {
    type: "BODY" | "HEADER" | "FOOTER" | "BUTTONS";
    format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO" | "LOCATION";
    text?: string;
    example?: {
        body_text?: string[][];
        header_handle?: string[];
        header_text?: string[];
    };
    buttons?: WhatsAppTemplateButton[];
}

export interface WhatsAppTemplate {
    name: string;
    language: string;
    status: string;
    components: WhatsAppTemplateComponent[];
}
