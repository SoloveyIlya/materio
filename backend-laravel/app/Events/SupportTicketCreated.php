<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportTicketCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $domainId;
    public $adminId;
    public $ticketId;
    public $unreadCount;

    /**
     * Create a new event instance.
     */
    public function __construct($domainId, $adminId, $ticketId, $unreadCount)
    {
        $this->domainId = $domainId;
        $this->adminId = $adminId;
        $this->ticketId = $ticketId;
        $this->unreadCount = $unreadCount;
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
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'support.ticket.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'domain_id' => $this->domainId,
            'admin_id' => $this->adminId,
            'ticket_id' => $this->ticketId,
            'unread_count' => $this->unreadCount,
        ];
    }
}
