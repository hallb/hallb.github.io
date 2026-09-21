---
# Test fixture for the Hugo templates. Never publish. `[ISS-53]`
# Crosswalk is invented; it exercises every dense element the site styles.
#
# draft: true is what keeps this unpublished. The 2026-10-01 date used to do
# it, by being in the future so that only a -F build rendered it -- which
# works until the date arrives, and then the page publishes itself with no
# commit involved. Do not remove the flag and rely on the date again.
title: Crosswalk
date: 2026-10-01
draft: true
summary: Reference page for a fictional record-linkage tool. Exercises every dense element the site has to style.
---

Crosswalk links records that refer to the same entity across registries that do
not share an identifier. You give it two or more tabular sources and a column
mapping. It gives you back a set of scored pairs and a decision for each one.

It does not clean your data, and it does not know what your entities are. Those
are still your job.

## Installing

Crosswalk needs Python 3.11 or later.

```console
$ pip install crosswalk
$ crosswalk --version
crosswalk 0.9.2
```

> [!NOTE]
> Version 0.9 changed the default address normalizer from `simple` to
> `libpostal`. Configs written against 0.8 will still run, and will produce
> different scores. Pin the normalizer explicitly if you need the old behaviour.

## Quick start

A run has three parts: the sources, the comparison, and the threshold. All three
live in one config file.

### Configuring the sources

Each source is a table with a stable primary key. Crosswalk reads CSV and
Parquet, and anything a DuckDB `read_*` function will open.

```yaml
sources:
  - name: licences
    path: data/business-licences.csv
    key: licence_no            # (1)
    fields:
      name: legal_name
      address: premises_address
      phone: contact_phone

  - name: permits
    path: data/permits.parquet
    key: permit_id
    fields:
      name: applicant          # (2)
      address: site_address

compare:
  - field: name
    strategy: jaro_winkler     # (3)
    weight: 0.5
  - field: address
    strategy: token_set
    weight: 0.4
  - field: phone
    strategy: exact
    weight: 0.1
    missing: skip              # (4)

threshold: 0.86
```

1. The key must be unique within the source. Crosswalk checks this on load and
   stops if it is not, because a duplicate key makes every downstream count
   wrong in a way that is hard to see.
2. Field names are mapped, not matched. The two sources call this column
   different things, and neither of them calls it what you would.
3. See [Comparison strategies](#comparison-strategies) for the full list and
   what each one costs.
4. `skip` drops the field from the comparison when either side is missing and
   renormalizes the remaining weights. The alternative, `zero`, scores it as a
   mismatch. Choose deliberately: registries with sparse phone columns will
   punish every pair under `zero`.

#### Column mapping and normalization

Mapping happens before comparison. Each mapped field runs through a normalizer
chosen by its name, unless you override it.

name
: Case-folded, punctuation stripped, legal suffixes reduced to a canonical
  form (`INCORPORATED`, `INC.`, and `Inc` all become `inc`).

address
: Parsed into components by libpostal, then reassembled. Unit numbers are
  preserved and compared separately.

phone
: Digits only, last ten retained.

> [!TIP]
> Run `crosswalk normalize --field name --sample 50` before your first match.
> Fifty normalized names next to their originals will tell you more about your
> data quality than any summary statistic, and it takes a minute.

### Running a match

```console
$ crosswalk match --config crosswalk.yml --out pairs.parquet
Loading licences   ... 12,481 rows, 0 duplicate keys
Loading permits    ... 30,117 rows, 0 duplicate keys
Blocking           ... 271,904 candidate pairs (0.07% of full product)
Scoring            ... done in 4.2s
Deciding at 0.86   ... 9,338 matched, 11,204 in overlap band, 251,362 rejected
Wrote pairs.parquet
```

The overlap band is reported separately from the matches because it is the part
worth your attention. See [Tuning the threshold](#tuning-the-threshold).

> [!IMPORTANT]
> Blocking is not a performance detail. Any pair the blocker does not generate
> cannot be matched, whatever its score would have been. The default blocker
> keys on the first three characters of the normalized name plus the postal code
> prefix, which will silently miss every pair where both are wrong. Check the
> blocker before you tune the threshold.

## Tuning the threshold

The threshold decides which scored pairs become matches. It has no correct
value. It has a value you can defend, which is different.

### Reviewing the overlap band

Crosswalk will draw a sample from the band and write it as a review file.

```console
$ crosswalk review --pairs pairs.parquet --band 0.72:0.94 --sample 200 --out review.csv
Sampled 200 of 11,204 pairs in band
```

The file has one row per pair, both records side by side, the score, and an
empty `decision` column. Fill in the column and hand it back:

```console
$ crosswalk report --review review.csv
Reviewed:        200
Agreed:          141
Disagreed:        38
Undecidable:      21

Estimated at threshold 0.86:
  false merge rate   0.021  (95% CI 0.008 - 0.049)
  false split rate   0.067  (95% CI 0.038 - 0.108)
```

> [!CAUTION]
> Those intervals are wide because 200 is a small sample of 11,204, and they are
> only valid for the band you sampled. They say nothing about pairs the blocker
> never generated. Quote them with the sample size attached or do not quote
> them.

> [!WARNING]
> `crosswalk review --auto` accepts the matcher's own decision for every pair
> and writes a review file that agrees with itself completely. It exists for
> smoke tests. Using its output as evidence of accuracy is circular, and the
> resulting error rates are always zero, which should be the tell.

## Reference

### Comparison strategies

| Strategy | Compares | Cost per pair | Transpositions | Abbreviations | Typical use |
|---|---|---|---|---|---|
| `exact` | Whole normalized string | Negligible | No | No | Phone numbers, postal codes, anything already canonical |
| `jaro_winkler` | Character overlap, weighted toward a shared prefix | Low | Yes | Partly | Person and company names where typos are the main failure |
| `token_set` | Unordered bag of tokens, best alignment | Moderate | Yes | No | Addresses and long names where word order varies |
| `token_sort` | Tokens sorted, then compared as a string | Moderate | Yes | No | Names given as "Last, First" in one source and "First Last" in the other |
| `levenshtein` | Edit distance, normalized by length | Moderate | No | No | Short codes and identifiers with substitution errors |
| `embedding` | Cosine distance between sentence embeddings | High, and needs a model on disk | Yes | Yes | Free-text descriptions. Slow, and hard to explain to an auditor who asks why two rows matched |

### Exit codes

`0`
: Match completed and the output was written.

`2`
: Config error. Nothing ran.

`3`
: A source failed its duplicate-key check.

`4`
: Blocking generated zero candidate pairs, which almost always means the
  blocking key is wrong rather than that your registries share nothing.
