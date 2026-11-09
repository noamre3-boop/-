import { Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { navigate } from '../lib/router';

export function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md">
      <EmptyState
        icon={Compass}
        title="This page doesn’t exist"
        description="The link may be outdated. Head back to your overview to continue."
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to overview
          </Button>
        }
      />
    </div>
  );
}
