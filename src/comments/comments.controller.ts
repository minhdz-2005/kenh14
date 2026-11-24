import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@Controller('articles/:slug/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to an article' })
  @ApiCreatedResponse({ description: 'The created comment' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  create(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCommentDto,
  ) {
    return this.comments.create(slug, user.id, body.comment);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get comments of an article',
    description: 'An optional bearer token determines following.',
  })
  @ApiOkResponse({ description: 'The article comments' })
  @ApiNotFoundResponse({ description: 'The article does not exist' })
  list(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.comments.list(slug, user?.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment owned by the current user' })
  @ApiNoContentResponse({ description: 'The comment was deleted' })
  @ApiNotFoundResponse({ description: 'The article or comment does not exist' })
  delete(
    @Param('slug') slug: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.comments.delete(slug, id, user.id);
  }
}