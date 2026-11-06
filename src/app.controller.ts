import { Controller, Get } from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('hello')
@Controller('hello')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Return a localized hello world message' })
  @ApiOkResponse({
    schema: {
      example: { message: 'Hello, world!' },
    },
  })
  async getHello(
    @I18n() i18n: I18nContext,
  ): Promise<{ message: string }> {
    return { message: await i18n.t('hello.message') };
  }
}
