import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiConsumes,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleFieldsDto } from './dto/update-article.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an article' })
  @ApiCreatedResponse({ description: 'The created article' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateArticleDto,
  ) {
    return this.articles.create(user.id, body.article);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an article by slug' })
  @ApiOkResponse({ description: 'The requested article' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  get(@Param('slug') slug: string) {
    return this.articles.findBySlug(slug);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: '' },
        description: { type: 'string', example: '' },
        body: { type: 'string', example: '' },
      },
    },
  })
  @ApiOperation({ summary: 'Update an article owned by the current user' })
  @ApiOkResponse({ description: 'The updated article' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  update(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateArticleFieldsDto,
  ) {
    return this.articles.update(slug, user.id, body);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an article owned by the current user' })
  @ApiNoContentResponse({ description: 'The article was deleted' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  delete(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.articles.delete(slug, user.id);
  }
}
