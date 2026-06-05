import { Controller, Post, Headers, RawBodyRequest, Req, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.webhooksService.handleStripeEvent(signature, req.rawBody!);
  }
}
