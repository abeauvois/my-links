import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { createBookmarkValidator } from '../validators/create-bookmark.validator'
import { InMemoryBookmarkRepository } from '../../../../src/infrastructure/repositories/InMemoryBookmarkRepository.js'
import { Bookmark } from '../../../../src/domain/entities/Bookmark'

const repository = new InMemoryBookmarkRepository()

export const bookmarks = new Hono<HonoEnv>().post(
  '/',
  createBookmarkValidator,
  async (c) => {
    const { url, sourceAdapter, tags = [], summary = '' } = c.req.valid('json')

    const bookmark = new Bookmark(url, sourceAdapter, tags, summary)

    if (!bookmark.isValid()) {
      return c.json({ error: 'Invalid bookmark data' }, 400)
    }

    await repository.save(bookmark)

    return c.json(bookmark, 201)
  },
)
