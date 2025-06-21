import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class MailService implements OnModuleInit {
  private mg: any;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeMailgun();
    this.loadTemplates();
  }

  private initializeMailgun() {
    const mailgunApiKey = this.configService.get<string>('env.mail.mailgun.apiKey');
    if (!mailgunApiKey) {
      this.logger.error(
        'Mailgun API key is not configured. Email sending will not work.'
      );
      return;
    }

    try {
      const mailgun = new Mailgun(FormData);
      this.mg = mailgun.client({
        username: 'api',
        key: mailgunApiKey,
        url: 'https://api.mailgun.net',
      });
      this.logger.log('Mailgun client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Mailgun client:', error);
    }
  }

  private loadTemplates() {
    try {
      const templatesDir = path.join(process.cwd(), 'src', 'templates');
      this.loadTemplatesFromDirectory(templatesDir);
      this.logger.log(
        `Email templates loaded successfully from ${templatesDir}`
      );
      
      // Log loaded templates for debugging
      const loadedTemplates = Array.from(this.templates.keys());
      this.logger.log(`Loaded templates: ${loadedTemplates.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to load email templates:', error);
    }
  }

  private loadTemplatesFromDirectory(directory: string) {
    if (!fs.existsSync(directory)) {
      this.logger.error(`Templates directory not found: ${directory}`);
      return;
    }

    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.loadTemplatesFromDirectory(filePath);
      } else if (file.endsWith('.template.hbs')) {
        try {
          const templateContent = fs.readFileSync(filePath, 'utf-8');
          // Get the relative path from the templates directory
          const relativePath = path.relative(
            path.join(process.cwd(), 'src', 'templates'),
            filePath
          );
          // Convert the path to use forward slashes and remove the .template.hbs extension
          const templateName = relativePath
            .split(path.sep)
            .join('/')
            .replace(/\.template\.hbs$/, '');
          
          this.templates.set(templateName, Handlebars.compile(templateContent));
          this.logger.log(`Loaded template: ${templateName}`);
        } catch (error) {
          this.logger.error(`Failed to load template ${filePath}:`, error);
        }
      }
    }
  }

  async sendMail(options: {
    to: string;
    subject: string;
    template?: string;
    context?: any;
    text?: string;
  }): Promise<boolean> {
    if (!this.mg) {
      this.logger.error(
        'Mailgun client is not initialized. Check your configuration.'
      );
      return false;
    }

    try {
      let html: string | undefined;
      let text = options.text;
      
      if (options.template) {
        const template = this.templates.get(options.template);
        if (!template) {
          this.logger.error(
            `Template "${options.template}" not found. Available templates: ${Array.from(
              this.templates.keys()
            ).join(', ')}`
          );
          return false;
        }
        html = template(options.context || {});
        
        // If no plain text is provided, create a basic text version from the template context
        if (!text) {
          text = this.createPlainTextVersion(options.context);
        }
      }

      // Ensure we have at least text content if no HTML
      if (!html && !text) {
        this.logger.error('Neither HTML template nor text content provided');
        return false;
      }

      const from = this.configService.get<string>('env.mail.from');
      const domain = this.configService.get<string>('env.mail.mailgun.domain');

      if (!from || !domain) {
        this.logger.error(
          'Missing mail configuration: "from" address or Mailgun domain not configured'
        );
        return false;
      }

      const messageData = {
        from,
        to: options.to,
        subject: options.subject,
        text,
        html,
      };

      await this.mg.messages.create(domain, messageData);
      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return false;
    }
  }

  private createPlainTextVersion(context: any): string {
    if (!context) return '';
    
    let text = '';
    if (context.name) {
      text += `Hi ${context.name},\n\n`;
    }
    
    if (context.code) {
      text += `Your verification code is: ${context.code}\n\n`;
    }
    
    if (context.ip) {
      text += `A new login was detected from IP address: ${context.ip}\n\n`;
    }
    
    text += 'If you need assistance, please contact our support department.\n\n';
    text += 'Regards,\nTeam Classigoo';
    
    return text;
  }
}
