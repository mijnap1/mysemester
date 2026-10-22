'use client';

import { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { expandItems, itemsTotal, MAX_SYLLABUS_FILE_BYTES, type SyllabusItem, type SyllabusResult } from '@/lib/syllabus';
import './syllabus.css';

type Step =
  | { kind: 'pick'; error?: string }
  | { kind: 'reading' }
  | { kind: 'review'; items: SyllabusItem[]; notes: string[] };

interface Props {
  open: boolean;
  courseCode: string;
  /** Rows already on the grade page; the import replaces them. */
  currentCount: number;
  onClose: () => void;
  onImport: (rows: { name: string; weight: number }[]) => void;
}

/** Rendered with a fresh `key` each time it opens, so it always starts at the upload step. */
export function SyllabusImport({ open, courseCode, currentCount, onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  function chooseFile(next: File | undefined) {
    if (!next) return;
    if (next.size > MAX_SYLLABUS_FILE_BYTES) {
      setStep({ kind: 'pick', error: 'That file is too big. Try a PDF under 4 MB.' });
      return;
    }
    setFile(next);
    setStep({ kind: 'pick' });
  }

  async function read() {
    if (!file) return;
    setStep({ kind: 'reading' });
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/syllabus/', { method: 'POST', body: form });
      const body = (await res.json()) as SyllabusResult & { error?: string };
      if (!res.ok) return setStep({ kind: 'pick', error: body.error ?? 'Couldn’t read that syllabus.' });
      if (!body.items.length) {
        return setStep({ kind: 'pick', error: 'Couldn’t find a grading breakdown in that file. You can still add assessments by hand.' });
      }
      setStep({ kind: 'review', items: body.items, notes: body.notes });
    } catch {
      setStep({ kind: 'pick', error: 'Couldn’t reach MySemester. Check your connection and try again.' });
    }
  }

  function edit(index: number, patch: Partial<SyllabusItem>) {
    if (step.kind !== 'review') return;
    setStep({ ...step, items: step.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  }

  const review = step.kind === 'review' ? step : null;
  const items = review?.items.filter((i) => i.name.trim() && i.weight > 0) ?? [];
  const total = itemsTotal(items);
  const rowCount = expandItems(items).length;

  return (
    <Dialog open={open} onClose={onClose} className="syllabus-dialog">
      <div className="syl">
        <button type="button" className="syl-close" aria-label="Close" onClick={onClose}>
          <Icon name="close-outline" />
        </button>
        <div className="syl-head">
          <h2>{review ? 'Check the grading breakdown' : `Import ${courseCode} syllabus`}</h2>
          <p>
            {review
              ? 'Fix anything that looks off. Nothing is added until you confirm.'
              : 'MySemester finds the grading breakdown and fills in your assessments.'}
          </p>
        </div>

        {step.kind === 'pick' && (
          <form
            className="syl-body"
            onSubmit={(e) => {
              e.preventDefault();
              void read();
            }}
          >
            <label
              className={`syl-drop${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                chooseFile(e.dataTransfer.files[0]);
              }}
            >
              <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={(e) => chooseFile(e.target.files?.[0])} />
              <Icon name={file ? 'document-text' : 'cloud-upload-outline'} />
              {file ? (
                <>
                  <strong>{file.name}</strong>
                  <span>Choose a different file</span>
                </>
              ) : (
                <>
                  <strong>Drop the syllabus PDF here</strong>
                  <span>or click to choose a file · up to 4 MB</span>
                </>
              )}
            </label>

            {step.error && <p className="syl-error">{step.error}</p>}

            <div className="syl-actions">
              <p className="syl-fine">Read once to find the grading breakdown, and never saved. The text may be processed by OpenAI.</p>
              {file && (
                <button type="button" className="syl-btn syl-btn-quiet" onClick={() => setFile(null)}>
                  Remove file
                </button>
              )}
              <button type="submit" className="syl-btn syl-btn-primary" disabled={!file}>
                Read syllabus
              </button>
            </div>
          </form>
        )}

        {step.kind === 'reading' && (
          <div className="syl-body syl-reading" role="status">
            <span className="syl-spinner" aria-hidden="true" />
            Reading the syllabus…
          </div>
        )}

        {review && (
          <div className="syl-body">
            <div className="syl-table" role="table" aria-label="Grading breakdown">
              <div className="syl-row syl-row-head" role="row">
                <span role="columnheader">Assessment</span>
                <span role="columnheader">Pieces</span>
                <span role="columnheader">Weight</span>
                <span />
              </div>
              {review.items.map((item, i) => (
                <div className="syl-row" role="row" key={i}>
                  <input aria-label="Assessment name" value={item.name} maxLength={80} onChange={(e) => edit(i, { name: e.target.value })} />
                  <input
                    aria-label="Number of pieces"
                    type="number"
                    min={1}
                    max={30}
                    value={item.count}
                    onChange={(e) => edit(i, { count: Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 1))) })}
                  />
                  <div className="syl-weight">
                    <input
                      aria-label="Total weight in percent"
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={item.weight}
                      onChange={(e) => edit(i, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    />
                    %
                  </div>
                  <button
                    type="button"
                    className="syl-remove"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setStep({ ...review, items: review.items.filter((_, j) => j !== i) })}
                  >
                    <Icon name="close-outline" />
                  </button>
                </div>
              ))}
              <button type="button" className="syl-add-row" onClick={() => setStep({ ...review, items: [...review.items, { name: '', weight: 0, count: 1 }] })}>
                + Add a row
              </button>
            </div>

            <p className={`syl-total${Math.abs(total - 100) < 0.5 ? ' is-ok' : ' is-off'}`}>
              <Icon name={Math.abs(total - 100) < 0.5 ? 'checkmark-circle' : 'alert-circle-outline'} />
              {Math.abs(total - 100) < 0.5
                ? 'Adds up to 100%'
                : total > 100
                  ? `Adds up to ${total}%. Lower a weight to continue.`
                  : `Adds up to ${total}%. Check for anything missing.`}
            </p>

            {review.notes.length > 0 && (
              <div className="syl-notes">
                <strong>Rules from the syllabus</strong>
                <ul>
                  {review.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <span>MySemester doesn’t apply these for you, so keep them in mind when entering grades.</span>
              </div>
            )}

            <div className="syl-actions">
              <p className="syl-fine">
                {currentCount > 0
                  ? `Replaces your ${currentCount} current row${currentCount === 1 ? '' : 's'}. Grades carry over where names match.`
                  : 'Pieces become separate rows, like Quiz 1, Quiz 2…'}
              </p>
              <button type="button" className="syl-btn syl-btn-quiet" onClick={() => setStep({ kind: 'pick' })}>
                Back
              </button>
              <button type="button" className="syl-btn syl-btn-primary" disabled={!items.length || total > 100.5} onClick={() => onImport(expandItems(items))}>
                Add {rowCount} row{rowCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
