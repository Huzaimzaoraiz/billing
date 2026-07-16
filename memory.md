# Caching / Memory Strategy

## Source of Truth

PostgreSQL

## Cache Layer (Optional)

Redis

Cache:
- Dashboard statistics
- Branch summaries
- Frequently accessed student records

Invalidate cache after:
- New payment
- Student update
- Fee plan update

## Why

Avoid expensive dashboard calculations.

Payment history is never modified directly.
Statistics are updated inside the same database transaction.

## Future Scaling

- Redis cache
- Materialized Views
- Read Replicas
- Background analytics jobs
