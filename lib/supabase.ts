import { createClient } from '@supabase/supabase-js'
import type { SkinData, UserProfile, Comment, SkinFormat } from '@/types/skin'

/**
 * Lazy initialization of Supabase client to avoid crash on startup in environment
 * with missing secrets.
 */
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
    return supabaseInstance
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error)
    return null
  }
}

// Helper: Convert Database Row to SkinData model
export function mapSkinDbToModel(row: any): SkinData {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    imageUrl: row.image_url || row.imageUrl || '',
    thumbnailUrl: row.thumbnail_url || row.thumbnailUrl || '',
    format: (row.format || '64x64') as SkinFormat,
    createdAt: new Date(row.created_at || row.createdAt || Date.now()),
    updatedAt: new Date(row.updated_at || row.updatedAt || Date.now()),
    authorId: row.author_id || row.authorId || '',
    authorName: row.author_name || row.authorName || 'Guest',
    authorAvatar: row.author_avatar || row.authorAvatar || '',
    likes: Number(row.likes ?? 0),
    downloads: Number(row.downloads ?? 0),
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',') : []),
  }
}

// Helpers: Convert Database Row to UserProfile model
export function mapProfileDbToModel(row: any): UserProfile {
  return {
    id: row.id,
    username: row.username || '',
    displayName: row.display_name || row.displayName || '',
    bio: row.bio || '',
    avatarUrl: row.avatar_url || row.avatarUrl || '',
    skinsCreated: Number(row.skins_created ?? row.skinsCreated ?? 0),
    totalDownloads: Number(row.total_downloads ?? row.totalDownloads ?? 0),
    followers: Number(row.followers ?? 0),
    following: Number(row.following ?? 0),
    publicProfile: Boolean(row.public_profile ?? row.publicProfile ?? true),
    createdAt: new Date(row.created_at || row.createdAt || Date.now()),
  }
}

// Helpers: Convert Database Row to Comment model
export function mapCommentDbToModel(row: any): Comment {
  return {
    id: row.id,
    skinId: row.skin_id || row.skinId || '',
    authorId: row.author_id || row.authorId || '',
    authorName: row.author_name || row.authorName || '',
    authorAvatar: row.author_avatar || row.authorAvatar || '',
    content: row.content || '',
    likes: Number(row.likes ?? 0),
    createdAt: new Date(row.created_at || row.createdAt || Date.now()),
  }
}

/* ==========================================
   DATABASE SERVICES (Skins, Profiles, Comments)
   ========================================== */

/**
 * Gets profiles list (using Supabase if configured, falls back to local storage).
 */
export async function dbGetUserProfile(id: string): Promise<UserProfile | null> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Does not exist
        throw error
      }
      return data ? mapProfileDbToModel(data) : null
    } catch (err) {
      console.warn('Supabase query failed, using localStorage fallback:', err)
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
    if (storedProfiles) {
      try {
        const list = JSON.parse(storedProfiles) as any[]
        const found = list.find((p) => p.id === id)
        return found ? mapProfileDbToModel(found) : null
      } catch (e) {
        console.error('Failed to parse localStorage profiles', e)
      }
    }
  }
  return null
}

export async function dbUpsertUserProfile(profile: UserProfile): Promise<void> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      const row = {
        id: profile.id,
        username: profile.username,
        display_name: profile.displayName || profile.username,
        bio: profile.bio || '',
        avatar_url: profile.avatarUrl || '',
        skins_created: profile.skinsCreated,
        total_downloads: profile.totalDownloads,
        followers: profile.followers,
        following: profile.following,
        public_profile: profile.publicProfile ?? true,
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase
        .from('profiles')
        .upsert(row, { onConflict: 'id' })
      
      if (!error) return
      throw error
    } catch (err) {
      console.warn('Supabase upsert failed, using localStorage fallback:', err)
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const storedProfiles = localStorage.getItem('kraftedit_user_profiles')
    let list: any[] = []
    if (storedProfiles) {
      try {
        list = JSON.parse(storedProfiles)
      } catch (e) {
        list = []
      }
    }
    const idx = list.findIndex(p => p.id === profile.id)
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...profile }
    } else {
      list.push(profile)
    }
    localStorage.setItem('kraftedit_user_profiles', JSON.stringify(list))
  }
}

/**
 * Gets all skins from database. Supports authors filter or isPublished filter.
 */
export async function dbGetSkins(options?: { authorId?: string; isPublished?: boolean }): Promise<SkinData[]> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      let query = supabase.from('skins').select('*')
      
      if (options?.authorId) {
        query = query.eq('author_id', options.authorId)
      }
      if (options?.isPublished !== undefined) {
        query = query.eq('is_published', options.isPublished)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      if (!error && data) {
        return data.map(mapSkinDbToModel)
      }
      throw error
    } catch (err) {
      console.warn('Supabase query.from("skins") failed, using localStorage fallback:', err)
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('savedSkins')
    if (stored) {
      try {
        let skins = JSON.parse(stored) as any[]
        if (options?.authorId) {
          skins = skins.filter(s => s.authorId === options.authorId || s.author_id === options.authorId)
        }
        if (options?.isPublished !== undefined) {
          skins = skins.filter(s => {
            const pub = s.isPublished ?? s.published ?? true
            return pub === options.isPublished
          })
        }
        return skins.map(mapSkinDbToModel)
      } catch (e) {
        console.error('Failed to parse skins from localStorage', e)
      }
    }
  }
  return []
}

export async function dbGetSkinById(id: string): Promise<SkinData | null> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('skins')
        .select('*')
        .eq('id', id)
        .single()
      
      if (!error && data) {
        return mapSkinDbToModel(data)
      }
      if (error && error.code === 'PGRST116') return null
      throw error
    } catch (err) {
      console.warn('Supabase getSkinById failed, using localStorage fallback:', err)
    }
  }

  // Fallback
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('savedSkins')
    if (stored) {
      try {
        const skins = JSON.parse(stored) as any[]
        const found = skins.find(s => s.id === id)
        return found ? mapSkinDbToModel(found) : null
      } catch (e) {
        console.error(e)
      }
    }
  }
  return null
}

export async function dbSaveSkin(skin: Partial<SkinData>): Promise<SkinData> {
  const completeSkinObj: SkinData = {
    id: skin.id || `skin-${Date.now()}`,
    name: skin.name || 'Untitled Skin',
    description: skin.description || '',
    imageUrl: skin.imageUrl || '',
    thumbnailUrl: skin.thumbnailUrl || skin.imageUrl || '',
    format: skin.format || '64x64',
    createdAt: skin.createdAt || new Date(),
    updatedAt: new Date(),
    authorId: skin.authorId || '',
    authorName: skin.authorName || 'Guest',
    authorAvatar: skin.authorAvatar || '',
    likes: skin.likes || 0,
    downloads: skin.downloads || 0,
    isPublished: skin.isPublished !== undefined ? skin.isPublished : true,
    tags: skin.tags || [],
  }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const row = {
        id: completeSkinObj.id,
        name: completeSkinObj.name,
        description: completeSkinObj.description,
        image_url: completeSkinObj.imageUrl,
        thumbnail_url: completeSkinObj.thumbnailUrl,
        format: completeSkinObj.format,
        author_id: completeSkinObj.authorId,
        author_name: completeSkinObj.authorName,
        author_avatar: completeSkinObj.authorAvatar,
        likes: completeSkinObj.likes,
        downloads: completeSkinObj.downloads,
        is_published: completeSkinObj.isPublished,
        tags: completeSkinObj.tags,
        updated_at: completeSkinObj.updatedAt.toISOString(),
        created_at: completeSkinObj.createdAt.toISOString()
      }
      const { error } = await supabase
        .from('skins')
        .upsert(row, { onConflict: 'id' })
      
      if (!error) return completeSkinObj
      throw error
    } catch (err) {
      console.warn('Supabase save skin failed, using localStorage fallback:', err)
    }
  }

  // Fallback
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('savedSkins')
    let skins: any[] = []
    if (stored) {
      try {
        skins = JSON.parse(stored)
      } catch (e) {
        skins = []
      }
    }
    const idx = skins.findIndex(s => s.id === completeSkinObj.id)
    if (idx >= 0) {
      skins[idx] = { ...skins[idx], ...completeSkinObj }
    } else {
      skins.push(completeSkinObj)
    }
    localStorage.setItem('savedSkins', JSON.stringify(skins))
  }

  return completeSkinObj
}

/**
 * Gets comments for a specific skin.
 */
export async function dbGetComments(skinId: string): Promise<Comment[]> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('skin_id', skinId)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        return data.map(mapCommentDbToModel)
      }
      throw error
    } catch (err) {
      console.warn('Supabase getComments failed, using localStorage fallback:', err)
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('savedComments')
    if (stored) {
      try {
        const comments = JSON.parse(stored) as any[]
        const found = comments.filter(c => c.skinId === skinId || c.skin_id === skinId)
        return found.map(mapCommentDbToModel)
      } catch (e) {
        console.error(e)
      }
    }
  }
  return []
}

export async function dbAddComment(comment: Partial<Comment>): Promise<Comment> {
  const completeComment: Comment = {
    id: comment.id || `comment-${Date.now()}`,
    skinId: comment.skinId || '',
    authorId: comment.authorId || '',
    authorName: comment.authorName || 'Guest',
    authorAvatar: comment.authorAvatar || '',
    content: comment.content || '',
    likes: comment.likes || 0,
    createdAt: comment.createdAt || new Date()
  }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const row = {
        id: completeComment.id,
        skin_id: completeComment.skinId,
        author_id: completeComment.authorId,
        author_name: completeComment.authorName,
        author_avatar: completeComment.authorAvatar,
        content: completeComment.content,
        likes: completeComment.likes,
        created_at: completeComment.createdAt.toISOString()
      }
      const { error } = await supabase
        .from('comments')
        .insert(row)
      
      if (!error) return completeComment
      throw error
    } catch (err) {
      console.warn('Supabase addComment failed, using localStorage fallback:', err)
    }
  }

  // Fallback
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('savedComments')
    let comments: any[] = []
    if (stored) {
      try {
        comments = JSON.parse(stored)
      } catch (e) {
        comments = []
      }
    }
    comments.push(completeComment)
    localStorage.setItem('savedComments', JSON.stringify(comments))
  }

  return completeComment
}
