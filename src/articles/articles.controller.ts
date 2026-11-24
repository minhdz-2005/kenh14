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
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { UpdateArticleFieldsDto } from './dto/update-article.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List articles from followed authors' })
  @ApiOkResponse({ description: 'The current user article feed' })
  feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.articles.feed(user.id, query);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'List articles',
    description: 'An optional bearer token determines favorited and following.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'author', required: false, type: String })
  @ApiQuery({ name: 'favorited', required: false, type: String })
  @ApiOkResponse({ description: 'The matching articles' })
  list(
    @Query() query: ListArticlesQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.articles.list(query, user?.id);
  }

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

  @Post(':slug/favorite')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Favorite an article' })
  @ApiOkResponse({ description: 'The favorited article' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  favorite(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.favorite(slug, user.id);
  }

  @Delete(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an article from favorites' })
  @ApiOkResponse({ description: 'The unfavorited article' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  unfavorite(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.unfavorite(slug, user.id);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get an article by slug' })
  @ApiOkResponse({ description: 'The requested article' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  get(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.articles.findBySlug(slug, user?.id);
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
