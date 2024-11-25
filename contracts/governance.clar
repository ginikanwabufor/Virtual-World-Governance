;; governance contract

(define-constant err-not-found (err u404))
(define-constant err-unauthorized (err u403))
(define-constant err-already-voted (err u401))

(define-map proposals
  uint
  {
    title: (string-ascii 256),
    description: (string-ascii 1024),
    proposer: principal,
    yes-votes: uint,
    no-votes: uint,
    status: (string-ascii 20),
    execution-params: (optional (buff 1024))
  }
)

(define-map votes { proposal-id: uint, voter: principal } bool)

(define-data-var proposal-count uint u0)

(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals proposal-id))

(define-public (create-proposal (title (string-ascii 256)) (description (string-ascii 1024)) (execution-params (optional (buff 1024))))
  (let
    (
      (proposal-id (+ (var-get proposal-count) u1))
    )
    (map-set proposals proposal-id
      {
        title: title,
        description: description,
        proposer: tx-sender,
        yes-votes: u0,
        no-votes: u0,
        status: "active",
        execution-params: execution-params
      }
    )
    (var-set proposal-count proposal-id)
    (ok proposal-id)))

(define-public (vote (proposal-id uint) (vote-for bool))
  (let
    (
      (proposal (unwrap! (map-get? proposals proposal-id) err-not-found))
      (vote-key { proposal-id: proposal-id, voter: tx-sender })
    )
    (asserts! (is-none (map-get? votes vote-key)) err-already-voted)
    (map-set votes vote-key vote-for)
    (if vote-for
      (map-set proposals proposal-id (merge proposal { yes-votes: (+ (get yes-votes proposal) u1) }))
      (map-set proposals proposal-id (merge proposal { no-votes: (+ (get no-votes proposal) u1) }))
    )
    (ok true)))

(define-public (finalize-proposal (proposal-id uint))
  (let
    (
      (proposal (unwrap! (map-get? proposals proposal-id) err-not-found))
    )
    (asserts! (is-eq (get status proposal) "active") err-unauthorized)
    (if (> (get yes-votes proposal) (get no-votes proposal))
      (map-set proposals proposal-id (merge proposal { status: "passed" }))
      (map-set proposals proposal-id (merge proposal { status: "rejected" }))
    )
    (ok true)))

