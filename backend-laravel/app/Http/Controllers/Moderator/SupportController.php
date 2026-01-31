<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SupportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Ticket::where('domain_id', $user->domain_id)
            ->where('user_id', $user->id)
            ->with(['assignedUser', 'attachments']);

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
            'description' => 'required|string|max:5000',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpeg,jpg,png,gif,webp,mp4,webm,ogg,mov,avi|max:10240', // 10MB max per file
        ]);

        $ticket = Ticket::create([
            'domain_id' => $user->domain_id,
            'user_id' => $user->id,
            'subject' => $validated['subject'],
            'description' => $validated['description'],
            'priority' => $validated['priority'] ?? 'medium',
            'status' => 'open',
        ]);

        // Обрабатываем вложения
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('ticket-attachments', 'public');
                $filePath = Storage::url($path);

                TicketAttachment::create([
                    'ticket_id' => $ticket->id,
                    'file_path' => $filePath,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        // Получаем количество непрочитанных тикетов для админа
        $adminId = $user->administrator_id;
        $unreadCount = 0;
        if ($adminId) {
            // Считаем все открытые тикеты для этого админа
            // (либо с непрочитанными сообщениями, либо совсем новые без сообщений)
            $unreadCount = Ticket::where('domain_id', $user->domain_id)
                ->where('status', '!=', 'closed')
                ->where(function ($query) use ($adminId) {
                    // Тикеты с непрочитанными сообщениями для админа
                    $query->whereHas('messages', function ($q) use ($adminId) {
                        $q->where('to_user_id', $adminId)
                            ->where('is_read', false);
                    })
                    // ИЛИ новые тикеты без сообщений вообще
                    ->orWhereDoesntHave('messages');
                })
                ->count();
        }

        // Broadcast событие о новом тикете
        broadcast(new \App\Events\SupportTicketCreated(
            $user->domain_id,
            $adminId,
            $ticket->id,
            $unreadCount
        ))->toOthers();

        return response()->json($ticket->load(['assignedUser', 'attachments']), 201);
    }

    public function show(Ticket $ticket, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($ticket->domain_id !== $user->domain_id || $ticket->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Загружаем сообщения тикета (только не удаленные) с пользователями
        $ticket->load([
            'assignedUser',
            'attachments',
            'messages' => function ($query) {
                $query->where('is_deleted', false)->orderBy('created_at', 'asc');
            },
            'messages.fromUser',
            'messages.toUser'
        ]);

        // Помечаем все непрочитанные сообщения от админа как прочитанные
        $administratorId = $user->administrator_id;
        if ($administratorId) {
            Message::where('ticket_id', $ticket->id)
                ->where('from_user_id', $administratorId)
                ->where('to_user_id', $user->id)
                ->where('is_read', false)
                ->where('is_deleted', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }

        return response()->json($ticket);
    }
}
