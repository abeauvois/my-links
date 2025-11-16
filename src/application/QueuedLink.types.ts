import { EmailLink } from '../domain/entities/EmailLink';


export interface QueuedLink {
    link: EmailLink;
    index: number;
    attempts: number;
}
