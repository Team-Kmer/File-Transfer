import { Room } from '../../../core/rooms/room.model';

export type RoomViewState =
  | { kind: 'loading' }
  | { kind: 'room'; room: Room }
  | { kind: 'pending'; code: string }
  | { kind: 'full' }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string };
