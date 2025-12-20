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
            ->with(['user.roles', 'assignedUser', 'messages.fromUser', 'messages.toUser']);

        // Фильтрация по категориям
        if ($request->has('category')) {
            $category = $request->category;
            switch ($category) {
                case 'new':
                    // Новые тикеты - где нет ответа от админа
                    $query->whereDoesntHave('messages', function ($q) use ($user) {
                        $q->where('from_user_id', $user->id);
                    });
                    break;
                case 'answered':
                    // Отвеченные тикеты - где есть ответ от админа
                    $query->whereHas('messages', function ($q) use ($user) {
                        $q->where('from_user_id', $user->id);
                    });
                    break;
                case 'moderator':
                    // Тикеты от модераторов
                    $query->whereHas('user.roles', function ($q) {
                        $q->where('roles.name', 'moderator');
                    });
                    break;
            }
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $tickets = $query->orderBy('created_at', 'desc')->get();

        return response()->json($tickets);
    }

    public function show(Ticket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($ticket->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($ticket->load(['user', 'assignedUser', 'messages.fromUser', 'messages.toUser']));
    }

    public function reply(Ticket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($ticket->domain_id !== $user->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        $message = \App\Models\Message::create([
            'domain_id' => $user->domain_id,
            'from_user_id' => $user->id,
            'to_user_id' => $ticket->user_id,
            'ticket_id' => $ticket->id,
            'subject' => 'Re: ' . $ticket->subject,
            'body' => $validated['body'],
            'type' => 'support',
        ]);

        // Обновляем статус тикета на in_progress, если он был open
        if ($ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }

        return response()->json($message->load(['fromUser', 'toUser']));
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
