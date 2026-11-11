import { useEffect, useState } from 'react';
import type { ChangeEvent, SubmitEvent } from 'react';
import { checkIn, getTodayRecord } from '../api/attendance';
import { toErrorMessages } from '../api/client';
import ErrorMessages from '../components/ErrorMessages';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { AttendanceRecord } from '../types/api';
import { formatDateTime } from '../utils/format';

// The gateway enforces the same limit; checking here only saves the user a pointless upload.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function CheckInPage() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  // Separate from todayRecord, because null alone cannot tell "still loading" from "not checked in".
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const previewUrl = useObjectUrl(selectedPhoto);

  useEffect(() => {
    // If the page leaves the screen before the answer arrives, the answer must be dropped.
    let ignore = false;

    async function loadTodayRecord() {
      try {
        const record = await getTodayRecord();
        if (!ignore) {
          setTodayRecord(record);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessages(toErrorMessages(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadTodayRecord();

    return () => {
      ignore = true;
    };
  }, []);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0] ?? null;
    if (photo !== null && photo.size > MAX_PHOTO_BYTES) {
      setSelectedPhoto(null);
      setErrorMessages([
        'The photo is larger than 5 MB. Please choose a smaller one.',
      ]);
      return;
    }
    setSelectedPhoto(photo);
    setErrorMessages([]);
  }

  async function handleCheckIn(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedPhoto === null) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessages([]);
    try {
      const record = await checkIn(selectedPhoto);
      setTodayRecord(record);
      setSelectedPhoto(null);
    } catch (error) {
      setErrorMessages(toErrorMessages(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p>Loading today&apos;s status…</p>;
  }

  if (todayRecord !== null) {
    return (
      <section>
        <h1>Check-in</h1>
        <p className="notice-success">
          You checked in on {formatDateTime(todayRecord.checkedInAt)}.
        </p>
        <p>Counted for work date {todayRecord.workDate}.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Check-in</h1>
      <p>
        You have not checked in today. Upload a photo of yourself working from
        home.
      </p>

      <form onSubmit={handleCheckIn}>
        <label htmlFor="photo">Photo (JPEG or PNG, up to 5 MB)</label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png"
          onChange={handlePhotoChange}
          disabled={isSubmitting}
        />

        {previewUrl !== null && (
          <img
            className="photo-preview"
            src={previewUrl}
            alt="Preview of the selected photo"
          />
        )}

        <ErrorMessages messages={errorMessages} />

        <button type="submit" disabled={selectedPhoto === null || isSubmitting}>
          {isSubmitting ? 'Checking in…' : 'Check in'}
        </button>
      </form>
    </section>
  );
}

export default CheckInPage;
