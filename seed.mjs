import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create all tables first
    console.log('Creating tables...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        loginMethod VARCHAR(64),
        role ENUM('public', 'member', 'editor', 'admin') DEFAULT 'member' NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        tags JSON,
        year INT NOT NULL,
        category ENUM('inquiry', 'answer', 'decision', 'pending', 'trouble', 'improvement') NOT NULL,
        status ENUM('draft', 'pending', 'published') DEFAULT 'draft' NOT NULL,
        authorId INT NOT NULL,
        authorRole ENUM('editor', 'admin') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        publishedAt TIMESTAMP NULL,
        relatedLinks JSON
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date TIMESTAMP NOT NULL,
        category VARCHAR(100) NOT NULL,
        checklist JSON,
        notes TEXT,
        attachments JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS river_cleaning_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        participantsCount INT,
        issues TEXT,
        whatWorked TEXT,
        whatToImprove TEXT,
        attachments JSON,
        linkedInventoryIds JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        photo VARCHAR(500),
        qty INT DEFAULT 0 NOT NULL,
        location VARCHAR(255) NOT NULL,
        condition VARCHAR(100),
        lastCheckedAt TIMESTAMP NULL,
        notes TEXT,
        tags JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        tags JSON,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        status ENUM('decided', 'pending') DEFAULT 'decided' NOT NULL,
        summary TEXT NOT NULL,
        details TEXT NOT NULL,
        evidenceLinks JSON,
        tags JSON,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS faq (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question VARCHAR(500) NOT NULL,
        answer TEXT NOT NULL,
        relatedRuleIds JSON,
        relatedPostIds JSON,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS changelog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        summary VARCHAR(255) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        authorId INT NOT NULL,
        authorRole ENUM('member', 'editor', 'admin') NOT NULL,
        relatedEntityType VARCHAR(100) NOT NULL,
        relatedEntityId INT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS secret_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Tables created');

    // Clear existing data
    await connection.query('DELETE FROM secret_notes');
    await connection.query('DELETE FROM changelog');
    await connection.query('DELETE FROM faq');
    await connection.query('DELETE FROM rules');
    await connection.query('DELETE FROM templates');
    await connection.query('DELETE FROM inventory');
    await connection.query('DELETE FROM river_cleaning_runs');
    await connection.query('DELETE FROM events');
    await connection.query('DELETE FROM posts');
    console.log('✓ Cleared existing data');

    // 1. Events (年間カレンダー)
    const events = [
      {
        title: '4月 組長会議',
        date: new Date('2025-04-05'),
        category: '会議',
        notes: '新年度の組長会議。役割分担と年間スケジュール確認',
        checklist: JSON.stringify([
          { id: '1', text: '議事録作成', completed: false },
          { id: '2', text: '年間スケジュール配布', completed: false },
          { id: '3', text: '役割分担表作成', completed: false },
        ]),
      },
      {
        title: '5月 河川清掃',
        date: new Date('2025-05-10'),
        category: '河川清掃',
        notes: '第1回河川清掃。天気予報確認、道具準備',
        checklist: JSON.stringify([
          { id: '1', text: '天気予報確認', completed: false },
          { id: '2', text: '道具点検・洗浄', completed: false },
          { id: '3', text: '参加者確認', completed: false },
          { id: '4', text: '飲み物手配', completed: false },
        ]),
      },
      {
        title: '6月 会費徴収締切',
        date: new Date('2025-06-30'),
        category: '締切',
        notes: '上半期会費徴収締切',
      },
      {
        title: '9月 河川清掃',
        date: new Date('2025-09-13'),
        category: '河川清掃',
        notes: '第2回河川清掃',
      },
      {
        title: '12月 組長会議',
        date: new Date('2025-12-06'),
        category: '会議',
        notes: '年度末組長会議。来年度の引き継ぎ準備',
      },
    ];

    for (const event of events) {
      await connection.query(
        'INSERT INTO events (title, date, category, notes, checklist, attachments) VALUES (?, ?, ?, ?, ?, ?)',
        [event.title, event.date, event.category, event.notes, event.checklist, JSON.stringify([])]
      );
    }
    console.log('✓ Seeded events');

    // 2. Inventory (備品台帳)
    const inventory = [
      {
        name: 'トング（大）',
        qty: 5,
        location: '倉庫 棚1段目',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '道具']),
        notes: '先端が少し曲がっているものあり',
      },
      {
        name: 'トング（小）',
        qty: 8,
        location: '倉庫 棚1段目',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '道具']),
      },
      {
        name: 'ゴミ袋（大・可燃）',
        qty: 100,
        location: '倉庫 棚2段目',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '消耗品']),
        notes: '次回購入予定：2025年8月',
      },
      {
        name: 'ゴミ袋（大・不燃）',
        qty: 50,
        location: '倉庫 棚2段目',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '消耗品']),
      },
      {
        name: '熊手',
        qty: 3,
        location: '倉庫 棚3段目',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '道具']),
      },
      {
        name: '防水手袋',
        qty: 30,
        location: '倉庫 棚2段目',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '消耗品']),
      },
      {
        name: 'テント（2x2m）',
        qty: 2,
        location: '倉庫 奥 床置き',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '設営']),
        notes: 'フレーム確認済み。ロープ付き',
      },
      {
        name: '長靴（各サイズ）',
        qty: 15,
        location: '倉庫 棚4段目',
        condition: 'やや劣化',
        tags: JSON.stringify(['河川清掃', '個人用']),
        notes: 'サイズ別に分類。破損品は交換予定',
      },
      {
        name: 'クーラーボックス',
        qty: 2,
        location: '倉庫 棚3段目',
        condition: '良好',
        tags: JSON.stringify(['河川清掃', '設営']),
      },
      {
        name: '懐中電灯',
        qty: 5,
        location: '倉庫 棚1段目',
        condition: '要確認',
        tags: JSON.stringify(['防災', '道具']),
        notes: '電池交換予定',
      },
    ];

    for (const item of inventory) {
      await connection.query(
        'INSERT INTO inventory (name, qty, location, condition, tags, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [item.name, item.qty, item.location, item.condition, item.tags, item.notes]
      );
    }
    console.log('✓ Seeded inventory');

    // 3. Templates (テンプレ置き場)
    const templates = [
      {
        title: '河川清掃 参加依頼文',
        category: '依頼文',
        body: `【河川清掃 参加のお願い】

日時：${new Date('2025-05-10').toLocaleDateString('ja-JP')} 午前8:00集合
場所：グリーンピア 玄関前

今年度も河川清掃を実施いたします。
つきましては、以下の通りご協力をお願いいたします。

【持ち物】
- 長靴
- 防水手袋
- 帽子・タオル
- 飲み物（各自）

【注意事項】
- 小学生以下のお子さんは保護者同伴でお願いします
- 妊娠中の方、体調不良の方は無理なさらないでください

ご不明な点は、組長までお問い合わせください。`,
      },
      {
        title: '会費徴収 確認文',
        category: '確認文',
        body: `【会費徴収のご確認】

いつもお世話になっております。

本年度の会費徴収につきまして、以下の通りご案内いたします。

【徴収内容】
- 町内会費：月額 ¥1,000
- 管理費：月額 ¥2,500
※管理会社より直接請求いたします

【お支払い方法】
- 銀行振込（指定口座）
- または管理会社窓口にてお支払いください

【注意事項】
- 二重徴収のないよう、ご注意ください
- 徴収に関するご質問は、管理会社までお問い合わせください`,
      },
      {
        title: '住民向け案内文',
        category: '案内文',
        body: `【グリーンピア 組長引き継ぎポータルについて】

この度、組長業務の引き継ぎを効率化するため、
「組長引き継ぎポータル」を開設いたしました。

【利用方法】
- ログインして、以下の情報をご確認ください：
  ✓ 年間カレンダー
  ✓ 河川清掃ガイド
  ✓ 備品台帳
  ✓ ルール・決定事項
  ✓ よくある質問

【個人情報について】
- 氏名・部屋番号などの個人情報は保存されません
- 安心してご利用ください`,
      },
      {
        title: '未返信リマインド',
        category: 'リマインド',
        body: `【リマインド】お返事をお待ちしています

いつもお世話になっております。

先日お送りした以下の件につきまして、
まだお返事をいただいていないようです。

【確認事項】
- [内容を記入]

お手数ですが、下記までご連絡ください。
- 組長 [名前]
- メール：[メールアドレス]
- 電話：[電話番号]

よろしくお願いいたします。`,
      },
    ];

    for (const template of templates) {
      await connection.query(
        'INSERT INTO templates (title, category, body, tags) VALUES (?, ?, ?, ?)',
        [template.title, template.category, template.body, JSON.stringify([])]
      );
    }
    console.log('✓ Seeded templates');

    // 4. Rules (ルール・決定事項)
    const rules = [
      {
        title: '会費徴収ルール',
        summary: '会費は管理会社が直接徴収。二重徴収を防止',
        status: 'decided',
        details: `【会費徴収について】

町内会費と管理費は、管理会社が直接住民から徴収します。
組長が別途徴収することはありません。

【金額】
- 町内会費：月額 ¥1,000
- 管理費：月額 ¥2,500

【重要】
- 住民から「会費を払った」という確認を受けた場合は、
  管理会社に照会してください
- 二重徴収のトラブルを防ぐため、必ず確認してください`,
        evidenceLinks: JSON.stringify(['https://example.com/rule1']),
        tags: JSON.stringify(['会費', '重要']),
      },
      {
        title: '組長ローテーション',
        summary: '世帯順でローテーション。免除は事前申告',
        status: 'decided',
        details: `【組長ローテーション】

組長は、世帯順でローテーションします。

【免除対象】
- 高齢者（65歳以上）
- 妊娠中・育児中の方
- 健康上の理由がある方
- その他特別な事情がある方

【申告方法】
- 前年度の組長会議で申告してください
- 事後申告は認めません`,
        tags: JSON.stringify(['ローテーション', '免除']),
      },
      {
        title: '出不足金ルール',
        summary: '河川清掃の欠席時は出不足金。金額は要検討',
        status: 'pending',
        details: `【出不足金について】

河川清掃に欠席した場合、出不足金をお支払いいただきます。

【現行ルール】
- 欠席時：¥2,000
- 代理出席：¥1,000

【検討中】
- 金額の妥当性
- 代理出席の条件
- 免除対象者の扱い

※このルールは（仮説）です。次年度の組長会議で決定予定`,
        tags: JSON.stringify(['出不足金', '仮説', '要検討']),
      },
    ];

    for (const rule of rules) {
      await connection.query(
        'INSERT INTO rules (title, summary, status, details, evidenceLinks, tags) VALUES (?, ?, ?, ?, ?, ?)',
        [rule.title, rule.summary, rule.status, rule.details, rule.evidenceLinks, rule.tags]
      );
    }
    console.log('✓ Seeded rules');

    // 5. FAQ (よくある質問)
    const faq = [
      {
        question: '会費はいくらですか？',
        answer: `町内会費は月額 ¥1,000、管理費は月額 ¥2,500 です。
管理会社が直接徴収するため、組長を通じての支払いはありません。
ご質問があれば、管理会社までお問い合わせください。`,
        relatedRuleIds: JSON.stringify([1]),
      },
      {
        question: '河川清掃に欠席した場合はどうなりますか？',
        answer: `欠席の場合、出不足金（現行 ¥2,000）をお支払いいただきます。
代理出席の場合は ¥1,000 です。
詳細は「ルール・決定事項」をご確認ください。`,
        relatedRuleIds: JSON.stringify([3]),
      },
      {
        question: '備品はどこにありますか？',
        answer: `備品は倉庫に保管されています。
詳細な場所・数量は「倉庫・備品台帳」をご確認ください。
不明な点があれば、前年度の組長にお問い合わせください。`,
        relatedRuleIds: JSON.stringify([]),
      },
      {
        question: '組長を免除してもらえますか？',
        answer: `高齢者（65歳以上）、妊娠中・育児中の方、健康上の理由がある方は、
前年度の組長会議で事前申告することで免除できます。
事後申告は認めていません。`,
        relatedRuleIds: JSON.stringify([2]),
      },
      {
        question: '個人情報は保存されますか？',
        answer: `このサイトでは、氏名・部屋番号・電話・メールなどの個人情報は
原則保存・表示されません。
必要な場合は、Admin限定の秘匿メモに隔離されます。`,
        relatedRuleIds: JSON.stringify([]),
      },
    ];

    for (const item of faq) {
      await connection.query(
        'INSERT INTO faq (question, answer, relatedRuleIds, relatedPostIds) VALUES (?, ?, ?, ?)',
        [item.question, item.answer, item.relatedRuleIds, JSON.stringify([])]
      );
    }
    console.log('✓ Seeded FAQ');

    // 6. Posts (年度ログ)
    const posts = [
      {
        title: '河川清掃の実施日時が決定しました',
        body: `第1回河川清掃の実施日時が決定いたしました。

【日時】
2025年5月10日（土）午前8:00集合

【場所】
グリーンピア 玄関前

【準備】
- 道具の点検・洗浄
- 飲み物の手配
- 参加者の確認

詳細は「河川清掃ガイド」をご確認ください。`,
        category: 'decision',
        status: 'published',
        year: 2025,
        authorId: 1,
        authorRole: 'admin',
        tags: JSON.stringify(['河川清掃', '日時決定']),
        publishedAt: new Date('2025-04-01'),
      },
      {
        title: '会費徴収について（重要）',
        body: `会費徴収ルールについて、ご質問をいただきました。

【質問】
「会費は組長が徴収するのか？」

【回答】
いいえ。会費は管理会社が直接住民から徴収します。
組長が別途徴収することはありません。

【理由】
- 二重徴収を防止
- 住民の混乱を回避
- 管理会社の統一管理

詳細は「ルール・決定事項」をご確認ください。`,
        category: 'answer',
        status: 'published',
        year: 2025,
        authorId: 1,
        authorRole: 'admin',
        tags: JSON.stringify(['会費', 'Q&A']),
        publishedAt: new Date('2025-04-05'),
      },
      {
        title: '出不足金ルールについて（仮説）',
        body: `出不足金ルールについて、改善提案をいただきました。

【現行ルール】
- 欠席時：¥2,000
- 代理出席：¥1,000

【改善提案】
- 金額が高すぎないか？
- 代理出席の条件をもっと明確にすべき
- 免除対象者の扱いを統一すべき

【対応】
次年度の組長会議で検討予定です。
ご意見・ご提案があれば、コメント欄にお願いします。`,
        category: 'pending',
        status: 'published',
        year: 2025,
        authorId: 1,
        authorRole: 'admin',
        tags: JSON.stringify(['出不足金', '仮説', '改善提案']),
        publishedAt: new Date('2025-04-10'),
      },
      {
        title: '倉庫の鍵について',
        body: `倉庫の鍵の管理方法について、質問をいただきました。

【質問】
「倉庫の鍵はどこにありますか？」

【回答】
倉庫の鍵は、前年度の組長が保管しています。
引き継ぎ時に受け取ってください。

【注意】
- 鍵を紛失した場合は、すぐに管理会社に報告してください
- 鍵のコピーは禁止です`,
        category: 'trouble',
        status: 'published',
        year: 2025,
        authorId: 1,
        authorRole: 'admin',
        tags: JSON.stringify(['倉庫', '鍵', 'トラブル']),
        publishedAt: new Date('2025-04-12'),
      },
      {
        title: '河川清掃のチェックリストを更新しました',
        body: `河川清掃のチェックリストを、より詳細に更新しました。

【更新内容】
- 準備段階：道具点検、飲み物手配、参加者確認
- 当日：集合確認、役割分担、安全確認
- 片付け：道具洗浄、保管、報告書作成
- 次年度申し送り：改善点、工夫、トラブル記録

詳細は「河川清掃ガイド」をご確認ください。`,
        category: 'improvement',
        status: 'published',
        year: 2025,
        authorId: 1,
        authorRole: 'admin',
        tags: JSON.stringify(['河川清掃', 'チェックリスト', '改善']),
        publishedAt: new Date('2025-04-15'),
      },
    ];

    for (const post of posts) {
      await connection.query(
        'INSERT INTO posts (title, body, category, status, year, authorId, authorRole, tags, publishedAt, relatedLinks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [post.title, post.body, post.category, post.status, post.year, post.authorId, post.authorRole, post.tags, post.publishedAt, JSON.stringify([])]
      );
    }
    console.log('✓ Seeded posts');

    // 7. Changelog (変更履歴)
    const changelog = [
      {
        summary: 'ポータル開設',
        date: new Date('2025-04-01'),
        authorId: 1,
        authorRole: 'admin',
        relatedEntityType: 'system',
      },
      {
        summary: '河川清掃ガイド公開',
        date: new Date('2025-04-02'),
        authorId: 1,
        authorRole: 'admin',
        relatedEntityType: 'post',
      },
      {
        summary: '備品台帳初期化（10件）',
        date: new Date('2025-04-03'),
        authorId: 1,
        authorRole: 'admin',
        relatedEntityType: 'inventory',
      },
      {
        summary: 'ルール・決定事項公開（3ページ）',
        date: new Date('2025-04-04'),
        authorId: 1,
        authorRole: 'admin',
        relatedEntityType: 'rule',
      },
      {
        summary: 'FAQ公開（5件）',
        date: new Date('2025-04-05'),
        authorId: 1,
        authorRole: 'admin',
        relatedEntityType: 'faq',
      },
    ];

    for (const item of changelog) {
      await connection.query(
        'INSERT INTO changelog (summary, date, authorId, authorRole, relatedEntityType, relatedEntityId) VALUES (?, ?, ?, ?, ?, ?)',
        [item.summary, item.date, item.authorId, item.authorRole, item.relatedEntityType, item.relatedEntityId || null]
      );
    }
    console.log('✓ Seeded changelog');

    // 8. Secret Notes (秘匿メモ - Admin限定)
    const secretNotes = [
      {
        title: '組長連絡先（秘密）',
        body: `【現組長】
- 名前：田中太郎
- 部屋：101号室
- 電話：090-XXXX-XXXX
- メール：tanaka@example.com

【前年度組長】
- 名前：佐藤花子
- 部屋：202号室
- 電話：090-YYYY-YYYY
- メール：sato@example.com`,
      },
      {
        title: '管理会社連絡先',
        body: `【管理会社】
グリーンピア管理センター
- 電話：054-XXX-XXXX
- メール：manager@greenpia.jp
- 営業時間：平日 9:00-17:00

【担当者】
- 山田太郎（施設管理）
- 鈴木花子（会費管理）`,
      },
      {
        title: '出不足金の記録（2024年度）',
        body: `【欠席者】
- 101号室 田中太郎：¥2,000（2024年5月）
- 305号室 鈴木花子：¥1,000（代理出席 2024年9月）

【合計】
¥3,000

【保管】
組長が保管。次年度に引き継ぎ予定`,
      },
    ];

    for (const note of secretNotes) {
      await connection.query(
        'INSERT INTO secret_notes (title, body) VALUES (?, ?)',
        [note.title, note.body]
      );
    }
    console.log('✓ Seeded secret notes');

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
