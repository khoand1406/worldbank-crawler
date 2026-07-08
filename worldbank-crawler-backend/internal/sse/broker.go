package sse

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type Event struct {
	Name string
	Data any
}

type Broker struct {
	mu      sync.Mutex
	clients map[chan Event]bool
}

func NewBroker() *Broker {
	return &Broker{
		clients: make(map[chan Event]bool),
	}
}

func (b *Broker) Subcribe() chan Event {
	ch := make(chan Event, 10)
	b.mu.Lock()
	b.clients[ch] = true
	b.mu.Unlock()
	return ch
}

func (b *Broker) Unsubcribe(ch chan Event) {
	b.mu.Lock()
	delete(b.clients, ch)
	close(ch)
	b.mu.Unlock()
}

func (b *Broker) Publish(event Event) {
	b.mu.Lock()
	defer b.mu.Unlock()

	for ch := range b.clients {
		select {
		case ch <- event:
		default:

		}
	}
}

func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch := b.Subcribe()
	defer b.Unsubcribe(ch)

	fmt.Fprintf(w, "event: connected\n")
	fmt.Fprintf(w, "data: {\"message\":\"connected\"}\n\n")
	flusher.Flush()

	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return

		case <-heartbeat.C:
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()

		case event := <-ch:
			data, err := json.Marshal(event.Data)
			if err != nil {
				continue
			}

			fmt.Fprintf(w, "event: %s\n", event.Name)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
