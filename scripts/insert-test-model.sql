-- Test model insertion — simulates one full wizard pass.
-- ARIA: 20대 한국인 여성, 럭셔리 뷰티/패션 컨셉, 차갑고 세련된 분위기.
-- Uses image.pollinations.ai (allowed host in next.config) so the catalog
-- card has a real-looking concept image without Easy Diffusion + storage.

with new_model as (
  insert into models (
    name, slug, debut_date, bio, personality,
    industry_tags, genre_tags, mood_tags,
    instagram_handle, follower_count,
    base_price, exclusive_price, is_exclusive_available,
    concept_image, status
  ) values (
    'ARIA',
    'aria',
    '2002-03-14',
    '럭셔리 뷰티 캠페인을 위해 설계된 1세대 버추얼 모델. 차가운 동양적 페이스에 미니멀 에디토리얼 톤. F&B·테크 산업까지 확장 가능한 멀티 포지션.',
    '냉정하고 정제된 분위기. 럭셔리 브랜드의 미니멀 캠페인에 최적. 표정은 절제, 시선은 직선적.',
    array['beauty','fashion','luxury']::text[],
    array['ad','editorial','lookbook']::text[],
    array['cold','elegant','minimal']::text[],
    'aria_virtual',
    28400,
    500000,
    2000000,
    true,
    'https://image.pollinations.ai/prompt/portrait%20of%20a%20young%20korean%20female%20fashion%20model%2C%20editorial%20studio%20lighting%2C%20minimalist%20luxury%20beauty%20campaign%2C%20cold%20mysterious%20atmosphere%2C%20high%20fashion%2C%20photorealistic?width=768&height=1024&nologo=true&seed=42',
    'active'
  )
  returning id
)
insert into model_files (model_id, file_type, url, version)
select id, 'portfolio', url, 1
from new_model,
     unnest(array[
       'https://image.pollinations.ai/prompt/korean%20female%20fashion%20model%20full%20body%2C%20editorial%20black%20backdrop%2C%20avant%20garde%20couture?width=768&height=1024&nologo=true&seed=11',
       'https://image.pollinations.ai/prompt/korean%20female%20fashion%20model%20close%20up%2C%20minimal%20makeup%2C%20cinematic%20lighting?width=768&height=1024&nologo=true&seed=22',
       'https://image.pollinations.ai/prompt/korean%20female%20fashion%20model%20side%20profile%2C%20marble%20studio%2C%20luxury%20jewelry%20ad?width=768&height=1024&nologo=true&seed=33',
       'https://image.pollinations.ai/prompt/korean%20female%20fashion%20model%20three%20quarter%20view%2C%20white%20couture%20dress%2C%20museum%20backdrop?width=768&height=1024&nologo=true&seed=44',
       'https://image.pollinations.ai/prompt/korean%20female%20fashion%20model%20editorial%20shot%2C%20moody%20gradient%20backdrop%2C%20high%20fashion%20perfume%20ad?width=768&height=1024&nologo=true&seed=55',
       'https://image.pollinations.ai/prompt/korean%20female%20virtual%20model%2C%20avant%20garde%20designer%20coat%2C%20neutral%20gallery%20interior?width=768&height=1024&nologo=true&seed=66'
     ]) as url;

-- Echo back the model so the operator can confirm.
select id, name, slug, status, concept_image
from models
where slug = 'aria';
