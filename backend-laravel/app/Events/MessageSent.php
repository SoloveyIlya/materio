<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $domainId;

    /**
     * Create a new event instance.
     */
    public function __construct(Message $message)
    {
        $this->message = $message;
        $this->domainId = $message->domain_id;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('domain.' . $this->domainId),
            new PrivateChannel('user.' . $this->message->to_user_id),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'from_user_id' => $this->message->from_user_id,
            'to_user_id' => $this->message->to_user_id,
            'content' => $this->message->content,
            'type' => $this->message->type,
            'is_read' => $this->message->is_read,
            'created_at' => $this->message->created_at,
            'created_at_formatted' => $this->message->created_at?->format('Y-m-d H:i:s'),
            'from_user' => [
                'id' => $this->message->fromUser?->id,
                'name' => $this->message->fromUser?->name,
                'avatar' => $this->message->fromUser?->avatar,
            ],
            'to_user' => [
                'id' => $this->message->toUser?->id,
                'name' => $this->message->toUser?->name,
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageSent'; // Изменено с 'message.sent' для совместимости с frontend
    }
}
