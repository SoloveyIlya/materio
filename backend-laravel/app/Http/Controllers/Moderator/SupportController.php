<?php

namespace App\Http\Controllers\Moderator;

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
            ->where('user_id', $user->id)
            ->with(['assignedUser']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        $tickets = $query->orderBy('created_at', 'desc')->get();

        return response()->json($tickets);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'description' => 'required|string|max:2000',
            'priority' => 'nullable|in:low,medium,high,urgent',
        ]);

        $ticket = Ticket::create([
            'domain_id' => $user->domain_id,
            'user_id' => $user->id,
            'subject' => $validated['subject'],
            'description' => $validated['description'],
            'priority' => $validated['priority'] ?? 'medium',
            'status' => 'open',
        ]);

        return response()->json($ticket->load(['assignedUser']), 201);
    }

    public function show(Ticket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($ticket->domain_id !== $user->domain_id || $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($ticket->load(['assignedUser']));
    }
}
