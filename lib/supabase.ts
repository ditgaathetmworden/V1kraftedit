import { createClient } from '@supabase/supabase-js'
import type { SkinData, UserProfile, Comment } from '@/types/skin'
import { mockSkins, mockUsers } from './mock-data'

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

// ─── Local Storage Database Helpers (Fallback Tier) ──────────────────────────

function getLocalSkins(): SkinData[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('kraftedit_user_skins')
  if (!stored) {
    // Initial bootstrap
    localStorage.setItem('kraftedit_user_skins', JSON.stringify(mockSkins))
    return mockSkins
  }
  try {
    const list = JSON.parse(stored) as any[]
    return list.map(s => ({
      ...s,
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
    }))
  } catch (e) {
    return mockSkins
  }
}

function saveLocalSkins(skins: SkinData[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('kraftedit_user_skins', JSON.stringify(skins))
}

function getLocalComments(): Comment[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('kraftedit_user_comments')
  if (!stored) {
    return []
  }
  try {
    const list = JSON.parse(stored) as any[]
    return list.map(c => ({
      ...c,
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date()
    }))
  } catch (e) {
    return []
  }
}

function saveLocalComments(comments: Comment[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('kraftedit_user_comments', JSON.stringify(comments))
}

function getLocalProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('kraftedit_user_profiles')
  if (!stored) {
    localStorage.setItem('kraftedit_user_profiles', JSON.stringify(mockUsers))
    return mockUsers
  }
  try {
    const list = JSON.parse(stored) as any[]
    return list.map(p => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
    }))
  } catch (e) {
    return mockUsers
  }
}

function saveLocalProfiles(profiles: UserProfile[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('kraftedit_user_profiles', JSON.stringify(profiles))
}

// ─── Unified Data Access Methods ─────────────────────────────────────────────

/**
 * Fetch all skins matching query filters.
 */
export async function dbGetSkins(filters?: { isPublished?: boolean; authorId?: string }): Promise<SkinData[]> {
  const client = getSupabase()
  if (client) {
    try {
      let query = client.from('skins').select('*')
      if (filters?.isPublished !== undefined) {
        query = query.eq('is_published', filters.isPublished)
      }
      if (filters?.authorId) {
        query = query.eq('author_id', filters.authorId)
      }
      const { data, error } = await query
      if (error) throw error
      if (data) {
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
    } catch (err) {
      console.error('Supabase query error on dbGetSkins, executing local fallback:', err)
    }
  }

  // Fallback
  let skins = getLocalSkins()
  if (filters) {
    if (filters.isPublished !== undefined) {
      skins = skins.filter(s => s.isPublished === filters.isPublished)
    }
    if (filters.authorId) {
      skins = skins.filter(s => s.authorId === filters.authorId)
    }
  }
  return skins
}

/**
 * Fetch a single skin by ID.
 */
export async function dbGetSkinById(id: string): Promise<SkinData | null> {
  const client = getSupabase()
  if (client) {
    try {
      const { data, error } = await client
        .from('skins')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
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
    } catch (err) {
      console.error('Supabase query error on dbGetSkinById, executing local fallback:', err)
    }
  }

  // Fallback
  const skins = getLocalSkins()
  return skins.find(s => s.id === id) || null
}

/**
 * Fetch comments for a specific skin.
 */
export async function dbGetComments(skinId: string): Promise<Comment[]> {
  const client = getSupabase()
  if (client) {
    try {
      const { data, error } = await client
        .from('comments')
        .select('*')
        .eq('skin_id', skinId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (data) {
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
    } catch (err) {
      console.error('Supabase query error on dbGetComments, executing local fallback:', err)
    }
  }

  // Fallback
  const comments = getLocalComments()
  return comments
    .filter(c => c.skinId === skinId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
  const commentPayload = {
    id: `comment-${Date.now()}`,
    skinId: comment.skinId,
    authorId: comment.authorId,
    authorName: comment.authorName,
    content: comment.content,
    likes: 0,
    createdAt: comment.createdAt || new Date()
  }

  if (client) {
    try {
      const { data, error } = await client
        .from('comments')
        .insert({
          id: commentPayload.id,
          skin_id: commentPayload.skinId,
          author_id: commentPayload.authorId,
          author_name: commentPayload.authorName,
          content: commentPayload.content,
          likes: 0,
          created_at: commentPayload.createdAt.toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      if (data) {
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
    } catch (err) {
      console.error('Supabase insert error on dbAddComment, executing local fallback:', err)
    }
  }

  // Fallback
  const comments = getLocalComments()
  comments.unshift(commentPayload)
  saveLocalComments(comments)
  return commentPayload
}

/**
 * Fetch profile details for a given user ID.
 */
export async function dbGetUserProfile(id: string): Promise<UserProfile | null> {
  const client = getSupabase()
  if (client) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
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
    } catch (err) {
      console.error('Supabase query error on dbGetUserProfile, executing local fallback:', err)
    }
  }

  // Fallback
  const profiles = getLocalProfiles()
  return profiles.find(p => p.id === id) || null
}

/**
 * Save or publish a skin.
 */
export async function dbPublishSkin(skin: Partial<SkinData>): Promise<SkinData> {
  const client = getSupabase()
  const mockId = skin.id || `skin-${Date.now()}`
  const now = new Date()

  const fullSkin: SkinData = {
    id: mockId,
    name: skin.name || 'Untitled Skin',
    description: skin.description || '',
    imageUrl: skin.imageUrl || '/default-skin.png',
    format: skin.format || '64x64',
    createdAt: skin.createdAt || now,
    updatedAt: now,
    authorId: skin.authorId || 'user-current',
    authorName: skin.authorName || 'Current User',
    authorAvatar: skin.authorAvatar || '',
    likes: skin.likes || 0,
    downloads: skin.downloads || 0,
    isPublished: skin.isPublished ?? true,
    tags: skin.tags || []
  }

  if (client) {
    try {
      const { data, error } = await client
        .from('skins')
        .upsert({
          id: fullSkin.id,
          name: fullSkin.name,
          description: fullSkin.description,
          image_url: fullSkin.imageUrl,
          format: fullSkin.format,
          created_at: fullSkin.createdAt.toISOString(),
          updated_at: fullSkin.updatedAt.toISOString(),
          author_id: fullSkin.authorId,
          author_name: fullSkin.authorName,
          author_avatar: fullSkin.authorAvatar,
          likes: fullSkin.likes,
          downloads: fullSkin.downloads,
          is_published: fullSkin.isPublished,
          tags: fullSkin.tags
        })
        .select()
        .single()
      
      if (error) throw error
      if (data) {
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
    } catch (err) {
      console.error('Supabase publish skin error, executing local fallback:', err)
    }
  }

  // Fallback
  const skins = getLocalSkins()
  const existingIndex = skins.findIndex(s => s.id === fullSkin.id)
  if (existingIndex > -1) {
    skins[existingIndex] = fullSkin
  } else {
    skins.push(fullSkin)
  }
  saveLocalSkins(skins)
  return fullSkin
}
