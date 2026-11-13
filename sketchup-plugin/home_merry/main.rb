# frozen_string_literal: true

module HomeMerryShop
  # Production store URL (HTTPS). For local testing, temporarily use:
    # SHOP_URL = 'http://localhost:3000'
  SHOP_URL = 'https://shophub-8eas.vercel.app'

  # Optional: open checkout / OAuth in the system browser so redirects work.
  CHECKOUT_PATHS = ['/checkout', '/login', '/api/auth'].freeze

  def self.open_shop
    if @dialog.nil?
      @dialog = UI::HtmlDialog.new(
        dialog_title: 'Home & Merry',
        preferences_key: 'com.homesbuiltuniquely.homemerry.shop',
        scrollable: true,
        resizable: true,
        width: 450,
        height: 700,
        style: UI::HtmlDialog::STYLE_DIALOG
      )
      @dialog.set_url(SHOP_URL)
      @dialog.set_on_closed { @dialog = nil }
    end
    @dialog.show
  end

  def self.open_in_browser(path = '/')
    url = path.start_with?('http') ? path : "#{SHOP_URL.chomp('/')}#{path}"
    UI.openURL(url)
  end

  unless file_loaded?(__FILE__)
    UI.menu('Extensions').add_item('Home & Merry Shop') { open_shop }

    cmd = UI::Command.new('Home & Merry Shop') { open_shop }
    cmd.tooltip = 'Open Home & Merry shop'
    cmd.status_bar_text = 'Browse the Home & Merry catalog inside SketchUp'

    icon_dir = File.dirname(__FILE__)
    small = File.join(icon_dir, 'icon_small.png')
    large = File.join(icon_dir, 'icon_large.png')
    cmd.small_icon = small if File.exist?(small)
    cmd.large_icon = large if File.exist?(large)

    toolbar = UI::Toolbar.new('Home & Merry')
    toolbar.add_item(cmd)
    toolbar.show

    file_loaded(__FILE__)
  end
end
