import { useEffect, useState } from 'react';
import { fetchAttendancePhoto } from '../api/attendance';
import { toErrorMessages } from '../api/client';
import { useObjectUrl } from '../hooks/useObjectUrl';
import ErrorMessages from './ErrorMessages';

type PhotoDialogProps = {
  recordId: number;
  title: string;
  onClose: () => void;
};

/**
 * Shows one attendance photo on top of the page.
 * The photo endpoint needs the token, and an <img src> cannot send it. So the photo is
 * downloaded with the API client, kept in memory, and shown through a temporary object URL.
 */
function PhotoDialog({ recordId, title, onClose }: PhotoDialogProps) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const photoUrl = useObjectUrl(photo);

  useEffect(() => {
    let ignore = false;

    async function loadPhoto() {
      try {
        const blob = await fetchAttendancePhoto(recordId);
        if (!ignore) {
          setPhoto(blob);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessages(toErrorMessages(error));
        }
      }
    }

    loadPhoto();

    return () => {
      ignore = true;
    };
  }, [recordId]);

  // Escape closes the dialog. The listener is removed when the dialog leaves the screen.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isLoading = photoUrl === null && errorMessages.length === 0;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // A click inside the dialog must not reach the backdrop, which would close it.
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button type="button" className="button-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {isLoading && <p>Loading photo…</p>}
        <ErrorMessages messages={errorMessages} />
        {photoUrl !== null && (
          <img className="dialog-photo" src={photoUrl} alt={title} />
        )}
      </div>
    </div>
  );
}

export default PhotoDialog;
