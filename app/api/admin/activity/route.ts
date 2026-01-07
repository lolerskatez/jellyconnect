import { NextResponse } from 'next/server'
import { database } from '@/app/lib/db'
import { successResponse, errorResponse, validationErrorResponse } from '@/app/lib/api-response'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const type = searchParams.get('type') // Optional filter by action type
    
    // Get audit log entries
    let activities = [...database.auditLog]
    
    // Filter by type if specified
    if (type) {
      activities = activities.filter(a => a.action === type)
    }
    
    // Sort by date (newest first)
    activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Get total count before pagination
    const total = activities.length
    
    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + limit)
    
    // Enrich activities with user info where possible
    const enrichedActivities = paginatedActivities.map(activity => {
      const user = activity.userId 
        ? database.users.find(u => u.id === activity.userId)
        : null
      
      return {
        ...activity,
        user: user ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        } : null,
      }
    })
    
    // Get action type counts for filtering UI
    const actionCounts: Record<string, number> = {}
    database.auditLog.forEach(entry => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1
    })
    
    return NextResponse.json(
      successResponse(
        {
          activities: enrichedActivities,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
          actionTypes: Object.entries(actionCounts).map(([action, count]) => ({
            action,
            count,
          })),
        },
        'Activity log retrieved successfully'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('[ACTIVITY] Error:', error)
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Failed to fetch activity log', 'ACTIVITY_FETCH_ERROR', 500),
      { status: 500 }
    )
  }
}

// POST endpoint to create new activity entries
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, action, details, ipAddress, userAgent } = body
    
    if (!action) {
      return NextResponse.json(
        validationErrorResponse([{ path: 'action', message: 'Action is required' }]),
        { status: 400 }
      )
    }
    
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      details,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
    }
    
    database.auditLog.push(entry)
    
    return NextResponse.json(
      successResponse({ entry }, 'Activity entry created successfully'),
      { status: 200 }
    )
  } catch (error) {
    console.error('[ACTIVITY] Error creating entry:', error)
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Failed to create activity entry', 'ACTIVITY_CREATE_ERROR', 500),
      { status: 500 }
    )
  }
}
