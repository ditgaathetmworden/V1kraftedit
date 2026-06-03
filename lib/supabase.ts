import { createClient } from '@supabase/supabase-js'
import type { SkinData, UserProfile, Comment } from '@/types/skin'

let supabaseClient: any = null

/**
 * Lazy init of Supabase client to avoid crashes if keys are not present inside env variables.
 */
export function getSupabase() {
  if (typeof window === 'undefined') return null
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
      } catch (err) {
        console.error('Failed to create Supabase client:', err)
      }
    }
  }
  return supabaseClient
}

// ─── Unified Data Access Methods ─────────────────────────────────────────────

/**
 * Fetch all skins matching query filters.
 */
export async function dbGetSkins(filters?: { isPublished?: boolean; authorId?: string }): Promise<SkinData[]> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase client not initialized')

  let query = client.from('skins').select('*')
  if (filters?.isPublished !== undefined) {
    query = query.eq('is_published', filters.isPublished)
  }
  if (filters?.authorId) {
    query = query.eq('author_id', filters.authorId)
  }
  const { data, error } = await query
  if (error) throw error
  if (!data) return []

  return data.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description || '',
    imageUrl: s.image_url || '/default-skin.png',
    format: s.format || '64x64',
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    authorId: s.author_id,
    authorName: s.author_name,
    authorAvatar: s.author_avatar,
    likes: s.likes || 0,
    downloads: s.downloads || 0,
    isPublished: s.is_published,
    tags: s.tags || []
  }))
}

/**
 * Fetch a single skin by ID.
 */
export async function dbGetSkinById(id: string): Promise<SkinData | null> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase client not initialized')

  const { data, error } = await client
    .from('skins')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null
  
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    imageUrl: data.image_url || '/default-skin.png',
    format: data.format || '64x64',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    authorId: data.author_id,
    authorName: data.author_name,
    authorAvatar: data.author_avatar,
    likes: data.likes || 0,
    downloads: data.downloads || 0,
    isPublished: data.is_published,
    tags: data.tags || []
  }
}

/**
 * Fetch comments for a specific skin.
 */
export async function dbGetComments(skinId: string): Promise<Comment[]> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase client not initialized')

  const { data, error } = await client
    .from('comments')
    .select('*')
    .eq('skin_id', skinId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  if (!data) return []

  return data.map((c: any) => ({
    id: c.id,
    skinId: c.skin_id,
    authorId: c.author_id,
    authorName: c.author_name,
    authorAvatar: c.author_avatar,
    content: c.content,
    likes: c.likes || 0,
    createdAt: new Date(c.created_at)
  }))
}

/**
 * Add a new comment to a skin.
 */
export async function dbAddComment(comment: {
  skinId: string
  authorId: string
  authorName: string
  content: string
  createdAt: Date
}): Promise<Comment> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase client not initialized')

  const { data, error } = await client
    .from('comments')
    .insert({
      skin_id: comment.skinId,
      author_id: comment.authorId,
      author_name: comment.authorName,
      content: comment.content,
      likes: 0,
      created_at: comment.createdAt.toISOString()
    })
    .select()
    .single()
  
  if (error) throw error
  if (!data) throw new Error('Failed to insert comment')

  return {
    id: data.id,
    skinId: data.skin_id,
    authorId: data.author_id,
    authorName: data.author_name,
    authorAvatar: data.author_avatar,
    content: data.content,
    likes: data.likes || 0,
    createdAt: new Date(data.created_at)
  }
}

/**
 * Fetch profile details for a given user ID.
 */
export async function dbGetUserProfile(id: string): Promise<UserProfile | null> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase client not initialized')

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    bio: data.bio || '',
    avatarUrl: data.avatar_url,
    skinsCreated: data.skins_created || 0,
    totalDownloads: data.total_downloads || 0,
    followers: data.followers || 0,
    following: data.following || 0,
    publicProfile: data.public_profile ?? true,
    createdAt: new Date(data.created_at)
  }
}

/**
 * Save or publish a skin.
 */
export async function dbPublishSkin(skin: Partial<SkinData>): Promise<SkinData> {
  const client = getSupabase()
  if (!client) throw new Error('Supabase client not initialized')

  const { data, error } = await client
    .from('skins')
    .upsert({
      id: skin.id, // Supabase handles IDs (or generates them)
      name: skin.name || 'Untitled Skin',
      description: skin.description || '',
      image_url: skin.imageUrl || '/default-skin.png',
      format: skin.format || '64x64',
      author_id: skin.authorId,
      author_name: skin.authorName,
      author_avatar: skin.authorAvatar,
      likes: skin.likes || 0,
      downloads: skin.downloads || 0,
      is_published: skin.isPublished ?? true,
      tags: skin.tags || []
    })
    .select()
    .single()
  
  if (error) throw error
  if (!data) throw new Error('Failed to insert/update skin')

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    imageUrl: data.image_url || '/default-skin.png',
    format: data.format || '64x64',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    authorId: data.author_id,
    authorName: data.author_name,
    authorAvatar: data.author_avatar,
    likes: data.likes || 0,
    downloads: data.downloads || 0,
    isPublished: data.is_published,
    tags: data.tags || []
  }
}
