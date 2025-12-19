<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Ticket::where('domain_id', $user->domain_id)
            ->with(['user', 'assignedUser']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $tickets = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($tickets);
    }

    public function show(Ticket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($ticket->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($ticket->load(['user', 'assignedUser']));
    }

    public function update(Ticket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($ticket->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:open,in_progress,resolved,closed',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'resolved') {
            $validated['resolved_at'] = now();
        }

        $ticket->update($validated);

        return response()->json($ticket->fresh()->load(['user', 'assignedUser']));
    }
}
